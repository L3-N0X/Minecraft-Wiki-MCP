import { apiService } from "./api.service.js";

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
    const response = await apiService.get<WikiResponse>("", {
      action: "query",
      list: "search",
      srsearch: query,
    });

    const results = response.query?.search?.map((item) => ({
      title: item.title,
      snippet: item.snippet.replace(/<[^>]*>/g, ""),
    }));

    if (!results?.length) {
      return "No results found.";
    }

    return results.map((r) => `Title: ${r.title}\nSnippet: ${r.snippet}`).join("\n\n");
  }

  async getPageSection(title: string, sectionIndex: number): Promise<string> {
    const response = await apiService.get<WikiResponse>("", {
      action: "parse",
      page: title,
      section: sectionIndex,
    });

    if (!response.parse?.text?.["*"]) {
      throw new Error(`No content found for section ${sectionIndex} of "${title}"`);
    }

    return response.parse.text["*"].replace(/<[^>]*>/g, "");
  }

  async listCategoryMembers(category: string, limit: number = 100): Promise<string> {
    const response = await apiService.get<WikiResponse>("", {
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${category}`,
      cmlimit: limit,
    });

    const members = response.query?.categorymembers?.map((item) => item.title);

    if (!members?.length) {
      return `No members found in category "${category}"`;
    }

    return members.join(", ");
  }

  async getPageContent(title: string): Promise<string> {
    const response = await apiService.get<WikiResponse>("", {
      action: "parse",
      page: title,
      prop: "wikitext",
    });

    const content = response.parse?.wikitext?.["*"];

    if (!content) {
      throw new Error(`No content found for page "${title}"`);
    }

    return content;
  }

  async resolveRedirect(title: string): Promise<string> {
    const response = await apiService.get<WikiResponse>("", {
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

    return page.title;
  }

  async listAllCategories(prefix?: string, limit: number = 10): Promise<string> {
    const response = await apiService.get<WikiResponse>("", {
      action: "query",
      list: "allcategories",
      acprefix: prefix,
      aclimit: limit,
    });

    const categories = response.query?.allcategories?.map((item) => item["*"]);

    if (!categories?.length) {
      return prefix ? `No categories found with prefix "${prefix}"` : "No categories found";
    }

    return categories.join("\n");
  }

  async getCategoriesForPage(title: string): Promise<string> {
    const response = await apiService.get<WikiResponse>("", {
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
      return `No categories found for page "${title}"`;
    }

    return page.categories.map((cat) => cat.title).join("\n");
  }

  async getSectionsInPage(title: string): Promise<string> {
    const response = await apiService.get<WikiResponse>("", {
      action: "parse",
      page: title,
      prop: "sections",
    });

    if (!response.parse?.sections?.length) {
      return `No sections found in page "${title}"`;
    }

    return response.parse.sections
      .map((section) => `Section ${section.index}: ${section.line}`)
      .join("\n");
  }

  async getPageSummary(title: string): Promise<string> {
    const section0 = await this.getPageSection(title, 0);
    const sections = await this.getSectionsInPage(title);
    return `Summary:\n${section0}\n\nSections:\n${sections}`;
  }
}

export const wikiService = new WikiService();
