import { apiService } from "./api.service.js";
import { sanitizeWikiContent, formatMCPText, createJsonSearchResult } from "../utils/utils.js";
import { extractCraftingRecipe, sanitizeWikiContentWithRecipes, RecipeExtractionResult } from "../utils/recipe-extractor.js";

interface WikiResponse {
  query?: {
    search?: Array<{
      title: string;
      snippet: string;
    }>;
    categorymembers?: Array<{
      title: string;
    }>;
    allcategories?: Array<{
      "*": string;
    }>;
    pages?: Record<
      string,
      {
        title: string;
        missing?: boolean;
        categories?: Array<{
          title: string;
        }>;
      }
    >;
  };
  parse?: {
    text?: {
      "*": string;
    };
    wikitext?: {
      "*": string;
    };
    sections?: Array<{
      index: string;
      line: string;
    }>;
  };
}

class WikiService {
  async searchWiki(query: string): Promise<string> {
    const response = await apiService.get<WikiResponse, Record<string, unknown>>("", {
      action: "query",
      list: "search",
      srsearch: query,
    });

    const results = response.query?.search;

    if (!results?.length) {
      return JSON.stringify({ results: [] });
    }

    // Return JSON-formatted results
    return createJsonSearchResult(results);
  }

  async getPageSection(title: string, sectionIndex: number): Promise<string> {
    const response = await apiService.get<WikiResponse, Record<string, unknown>>("", {
      action: "parse",
      page: title,
      section: sectionIndex,
    });

    if (!response.parse?.text?.["*"]) {
      throw new Error(`No content found for section ${sectionIndex} of "${title}"`);
    }

    const rawContent = response.parse.text["*"];
    const content = sanitizeWikiContent(rawContent);
    
    // Check if this section contains crafting recipe information
    const recipeResult = extractCraftingRecipe(rawContent, title, sectionIndex);
    
    if (recipeResult.hasRecipe) {
      return JSON.stringify({
        title: formatMCPText(title),
        sectionIndex: sectionIndex,
        content: content,
        crafting_recipe: recipeResult.crafting_recipe,
      });
    }

    return JSON.stringify({
      title: formatMCPText(title),
      sectionIndex: sectionIndex,
      content: content,
    });
  }

  async listCategoryMembers(category: string, limit: number = 100): Promise<string> {
    const response = await apiService.get<WikiResponse, Record<string, unknown>>("", {
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${category}`,
      cmlimit: limit,
    });

    const members = response.query?.categorymembers?.map((item) => item.title);

    if (!members?.length) {
      return JSON.stringify({
        category: formatMCPText(category),
        members: [],
      });
    }

    return JSON.stringify({
      category: formatMCPText(category),
      members: members.map((member) => formatMCPText(member)),
    });
  }

  async getPageContent(title: string): Promise<string> {
    const response = await apiService.get<WikiResponse, Record<string, unknown>>("", {
      action: "parse",
      page: title,
      prop: "wikitext",
    });

    const content = response.parse?.wikitext?.["*"];

    if (!content) {
      throw new Error(`No content found for page "${title}"`);
    }

    return JSON.stringify({
      title: formatMCPText(title),
      content: sanitizeWikiContent(content),
    });
  }

  async resolveRedirect(title: string): Promise<string> {
    const response = await apiService.get<WikiResponse, Record<string, unknown>>("", {
      action: "query",
      titles: title,
      redirects: true,
    });

    const pages = response.query?.pages;
    if (!pages) {
      throw new Error(`Failed to resolve redirect for "${title}"`);
    }

    const page = Object.values(pages)[0];
    if (page.missing) {
      throw new Error(`Page "${title}" not found`);
    }

    return JSON.stringify({
      originalTitle: formatMCPText(title),
      resolvedTitle: formatMCPText(page.title),
    });
  }

  async listAllCategories(prefix?: string, limit: number = 10): Promise<string> {
    const response = await apiService.get<WikiResponse, Record<string, unknown>>("", {
      action: "query",
      list: "allcategories",
      acprefix: prefix,
      aclimit: limit,
    });

    const categories = response.query?.allcategories?.map((item) => item["*"]);

    if (!categories?.length) {
      return JSON.stringify({
        prefix: prefix ? formatMCPText(prefix) : null,
        categories: [],
      });
    }

    return JSON.stringify({
      prefix: prefix ? formatMCPText(prefix) : null,
      categories: categories.map((category) => formatMCPText(category)),
    });
  }

  async getCategoriesForPage(title: string): Promise<string> {
    const response = await apiService.get<WikiResponse, Record<string, unknown>>("", {
      action: "query",
      titles: title,
      prop: "categories",
    });

    const pages = response.query?.pages;
    if (!pages) {
      throw new Error(`Failed to get categories for "${title}"`);
    }

    const page = Object.values(pages)[0];
    if (page.missing) {
      throw new Error(`Page "${title}" not found`);
    }

    if (!page.categories?.length) {
      return JSON.stringify({
        title: formatMCPText(title),
        categories: [],
      });
    }

    return JSON.stringify({
      title: formatMCPText(title),
      categories: page.categories.map((cat) => formatMCPText(cat.title)),
    });
  }

  async getSectionsInPage(title: string): Promise<string> {
    const response = await apiService.get<WikiResponse, Record<string, unknown>>("", {
      action: "parse",
      page: title,
      prop: "sections",
    });

    if (!response.parse?.sections?.length) {
      return JSON.stringify({
        title: formatMCPText(title),
        sections: [],
      });
    }

    return JSON.stringify({
      title: formatMCPText(title),
      sections: response.parse.sections.map((section) => ({
        index: parseInt(section.index),
        title: formatMCPText(section.line),
      })),
    });
  }

  async getPageSummary(title: string): Promise<string> {
    try {
      const section0 = await this.getPageSection(title, 0);
      const sections = await this.getSectionsInPage(title);

      // Parse the section0 content
      let section0Content = "";
      try {
        const parsed = JSON.parse(section0);
        section0Content = parsed.content || "";
      } catch {
        section0Content = section0;
      }

      return JSON.stringify({
        title: formatMCPText(title),
        summary: formatMCPText(section0Content).substring(0, 200),
        sections: JSON.parse(sections).sections || [],
      });
    } catch (error) {
      return JSON.stringify({
        title: formatMCPText(title),
        error: error instanceof Error ? error.message : "Unknown error",
        summary: "",
        sections: [],
      });
    }
  }

  async getCraftingRecipe(title: string): Promise<string> {
    try {
      // First get all sections to find crafting-related ones
      const sectionsResponse = await this.getSectionsInPage(title);
      const sectionsData = JSON.parse(sectionsResponse);
      
      // Look for crafting-related sections
      const craftingSections = sectionsData.sections.filter((section: any) => 
        /craft|recipe|ingredients/i.test(section.title)
      );

      let bestRecipe = null;
      let bestSection = null;

      // Try to extract recipes from crafting sections
      for (const section of craftingSections) {
        try {
          const response = await apiService.get<WikiResponse, Record<string, unknown>>("", {
            action: "parse",
            page: title,
            section: section.index,
          });

          if (response.parse?.text?.["*"]) {
            const rawContent = response.parse.text["*"];
            const recipeResult = extractCraftingRecipe(rawContent, title, section.index);
            
            if (recipeResult.hasRecipe && recipeResult.crafting_recipe) {
              bestRecipe = recipeResult.crafting_recipe;
              bestSection = section;
              break; // Use the first valid recipe found
            }
          }
        } catch (error) {
          // Continue searching other sections if this one fails
          continue;
        }
      }

      // If no crafting section found, try the full page content
      if (!bestRecipe) {
        try {
          const contentResponse = await this.getPageContent(title);
          const contentData = JSON.parse(contentResponse);
          const recipeResult = extractCraftingRecipe(contentData.content, title);
          
          if (recipeResult.hasRecipe) {
            bestRecipe = recipeResult.crafting_recipe;
          }
        } catch (error) {
          // Ignore error and return no recipe found
        }
      }

      if (bestRecipe) {
        return JSON.stringify({
          title: formatMCPText(title),
          crafting_recipe: bestRecipe,
          source_section: bestSection ? {
            index: bestSection.index,
            title: formatMCPText(bestSection.title)
          } : null,
        });
      } else {
        return JSON.stringify({
          title: formatMCPText(title),
          crafting_recipe: null,
          message: "No crafting recipe found for this item",
        });
      }
    } catch (error) {
      return JSON.stringify({
        title: formatMCPText(title),
        error: error instanceof Error ? error.message : "Unknown error",
        crafting_recipe: null,
      });
    }
  }
}

export const wikiService = new WikiService();
