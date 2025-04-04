#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// Minecraft Wiki API base URL
const WIKIMEDIA_API_URL = "https://minecraft.wiki/api.php";

// Define tools
const SEARCH_WIKI_MINECRAFTWIKI_TOOL: Tool = {
  name: "MinecraftWiki_searchWiki",
  description:
    "Search the Minecraft Wiki for a specific structure, entity, item or block. Shorter search terms are generally more effective.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search term to find on the Minecraft Wiki.",
      },
    },
    required: ["query"],
  },
};

const GET_PAGE_SECTION_MINECRAFTWIKI_TOOL: Tool = {
  name: "MinecraftWiki_getPageSection",
  description:
    "Get a specific section from a Minecraft Wiki page. The section index corresponds to the order of sections on the page, starting with 0 for the main content, 1 for the first section, 2 for the second section, etc. You can manually inspect the page to determine the correct section index.",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the Minecraft Wiki page",
      },
      sectionIndex: {
        type: "number",
        description:
          "Index of the section to retrieve (0 = main, 1 = first section, 2 = second section, etc.)",
      },
    },
    required: ["title", "sectionIndex"],
  },
};

const LIST_CATEGORY_MEMBERS_MINECRAFTWIKI_TOOL: Tool = {
  name: "MinecraftWiki_listCategoryMembers",
  description: "List all pages that are members of a specific category on the Minecraft Wiki.",
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description:
          "The name of the category to list members from (e.g., 'Items', 'Blocks', 'Entities', 'Structure Blueprints').",
      },
      limit: {
        type: "number",
        description: "The maximum number of pages to return (default: 10, max: 500).",
      },
    },
    required: ["category"],
  },
};

const GET_PAGE_CONTENT_MINECRAFTWIKI_TOOL: Tool = {
  name: "MinecraftWiki_getPageContent",
  description: "Get the raw wikitext content of a specific Minecraft Wiki page.",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the Minecraft Wiki page to retrieve the raw wikitext content for.",
      },
    },
    required: ["title"],
  },
};

const RESOLVE_REDIRECT_MINECRAFTWIKI_TOOL: Tool = {
  name: "MinecraftWiki_resolveRedirect",
  description: "Resolve a redirect and return the title of the target page.",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the page to resolve the redirect for.",
      },
    },
    required: ["title"],
  },
};

const LIST_ALL_CATEGORIES_MINECRAFTWIKI_TOOL: Tool = {
  name: "MinecraftWiki_listAllCategories",
  description: "List all categories in the Minecraft Wiki.",
  inputSchema: {
    type: "object",
    properties: {
      prefix: {
        type: "string",
        description: "Filters categories by prefix.",
      },
      limit: {
        type: "number",
        description: "The maximum number of categories to return (default: 10, max: 500).",
      },
    },
  },
};

const GET_CATEGORIES_FOR_PAGE_MINECRAFTWIKI_TOOL: Tool = {
  name: "MinecraftWiki_getCategoriesForPage",
  description: "Get categories associated with a specific page.",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the page to retrieve categories for.",
      },
    },
    required: ["title"],
  },
};

const GET_SECTIONS_IN_PAGE_MINECRAFTWIKI_TOOL: Tool = {
  name: "MinecraftWiki_getSectionsInPage",
  description: "Retrieves an overview of all sections in the page.",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the page to retrieve sections for.",
      },
    },
    required: ["title"],
  },
};

// Initialize the MCP server
const server = new Server(
  {
    name: "MinecraftWikiMCP",
    version: "1.0.0",
    description: "Interact with the Minecraft Wiki via the MediaWiki API",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Type guards
function isSearchWikiArgs(args: unknown): args is { query: string } {
  return (
    typeof args === "object" &&
    args !== null &&
    "query" in args &&
    typeof (args as { query: string }).query === "string"
  );
}

function isGetPageSectionArgs(args: unknown): args is { title: string; sectionIndex: number } {
  return (
    typeof args === "object" &&
    args !== null &&
    "title" in args &&
    typeof (args as { title: string }).title === "string" &&
    "sectionIndex" in args &&
    typeof (args as { sectionIndex: number }).sectionIndex === "number"
  );
}

function isListCategoryMembersArgs(args: unknown): args is { category: string; limit?: number } {
  return (
    typeof args === "object" &&
    args !== null &&
    "category" in args &&
    typeof (args as { category: string }).category === "string" &&
    ("limit" in args ? typeof (args as { limit: number }).limit === "number" : true)
  );
}

function isGetPageContentArgs(args: unknown): args is { title: string } {
  return (
    typeof args === "object" &&
    args !== null &&
    "title" in args &&
    typeof (args as { title: string }).title === "string"
  );
}

function isResolveRedirectArgs(args: unknown): args is { title: string } {
  return (
    typeof args === "object" &&
    args !== null &&
    "title" in args &&
    typeof (args as { title: string }).title === "string"
  );
}

function isListAllCategoriesArgs(args: unknown): args is { prefix?: string; limit?: number } {
  return (
    typeof args === "object" &&
    args !== null &&
    ("prefix" in args ? typeof (args as { prefix: string }).prefix === "string" : true) &&
    ("limit" in args ? typeof (args as { limit: number }).limit === "number" : true)
  );
}

function isGetCategoriesForPageArgs(args: unknown): args is { title: string } {
  return (
    typeof args === "object" &&
    args !== null &&
    "title" in args &&
    typeof (args as { title: string }).title === "string"
  );
}

function isGetSectionsInPageArgs(args: unknown): args is { title: string } {
  return (
    typeof args === "object" &&
    args !== null &&
    "title" in args &&
    typeof (args as { title: string }).title === "string"
  );
}

async function listCategoryMembersMinecraftWiki(category: string, limit: number = 10) {
  try {
    const response = await axios.get(WIKIMEDIA_API_URL, {
      params: {
        action: "query",
        format: "json",
        list: "categorymembers",
        cmtitle: `Category:${category}`,
        cmlimit: limit,
        origin: "*",
      },
    });

    const results = response.data.query.categorymembers.map((item: any) => item.title);
    return results.join("\n");
  } catch (error) {
    throw new Error(
      `Error fetching category members: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function getPageContentMinecraftWiki(title: string) {
  try {
    const response = await axios.get(WIKIMEDIA_API_URL, {
      params: {
        action: "query",
        format: "json",
        prop: "revisions",
        rvprop: "content",
        titles: title,
        origin: "*",
      },
    });

    const pages = response.data.query.pages;
    const page = Object.values(pages)[0] as {
      revisions?: [{ content: string }];
      missing?: boolean;
    };

    if (page.missing) {
      throw new Error(`Page "${title}" not found.`);
    }

    return page.revisions?.[0].content || `No content found for "${title}"`;
  } catch (error) {
    throw new Error(
      `Error fetching page content: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function resolveRedirectMinecraftWiki(title: string) {
  try {
    const response = await axios.get(WIKIMEDIA_API_URL, {
      params: {
        action: "query",
        format: "json",
        titles: title,
        redirects: true,
        origin: "*",
      },
    });

    const pages = response.data.query.pages;
    const page = Object.values(pages)[0] as { title: string; missing?: boolean };

    if (page.missing) {
      throw new Error(`Page "${title}" not found.`);
    }

    return page.title;
  } catch (error) {
    throw new Error(
      `Error resolving redirect: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Tool handlers
async function searchMinecraftWiki(query: string) {
  try {
    const response = await axios.get(WIKIMEDIA_API_URL, {
      params: {
        action: "query",
        format: "json",
        list: "search",
        srsearch: query,
        origin: "*",
      },
    });

    const results = response.data.query.search.map((item: any) => ({
      title: item.title,
      snippet: item.snippet.replace(/<[^>]*>/g, ""), // Remove HTML tags
    }));

    return results
      .map((r: { title: string; snippet: string }) => `Title: ${r.title}\nSnippet: ${r.snippet}`)
      .join("\n\n");
  } catch (error) {
    throw new Error(
      `Error fetching search results: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function getPageSectionMinecraftWiki(title: string, sectionIndex: number) {
  try {
    const response = await axios.get(WIKIMEDIA_API_URL, {
      params: {
        action: "parse",
        format: "json",
        page: title,
        section: sectionIndex,
        origin: "*",
      },
    });

    if (response.data.error) {
      throw new Error(
        `Error fetching section ${sectionIndex} of "${title}": ${response.data.error.info}`
      );
    }

    if (!response.data.parse || !response.data.parse.text) {
      throw new Error(`Unexpected response structure for "${title}" section ${sectionIndex}`);
    }

    const sectionContent = response.data.parse.text["*"];

    // Remove HTML tags from section content
    const cleanedSectionContent = sectionContent.replace(/<[^>]*>/g, "");

    return cleanedSectionContent;
  } catch (error) {
    throw new Error(
      `Error fetching page section: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    SEARCH_WIKI_MINECRAFTWIKI_TOOL,
    GET_PAGE_SECTION_MINECRAFTWIKI_TOOL,
    LIST_CATEGORY_MEMBERS_MINECRAFTWIKI_TOOL,
    GET_PAGE_CONTENT_MINECRAFTWIKI_TOOL,
    RESOLVE_REDIRECT_MINECRAFTWIKI_TOOL,
    LIST_ALL_CATEGORIES_MINECRAFTWIKI_TOOL,
    GET_CATEGORIES_FOR_PAGE_MINECRAFTWIKI_TOOL,
    GET_SECTIONS_IN_PAGE_MINECRAFTWIKI_TOOL,
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      case "MinecraftWiki_searchWiki": {
        if (!isSearchWikiArgs(args)) {
          throw new Error("Invalid arguments for searchWiki");
        }
        const { query } = args;
        const results = await searchMinecraftWiki(query);
        console.log("Search results:", results);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      case "MinecraftWiki_getPageSection": {
        if (!isGetPageSectionArgs(args)) {
          throw new Error("Invalid arguments for getPageSection");
        }
        const { title, sectionIndex } = args;
        const section = await getPageSectionMinecraftWiki(title, sectionIndex);
        console.log("Section content:", section);
        return {
          content: [{ type: "text", text: section }],
          isError: false,
        };
      }

      case "MinecraftWiki_listCategoryMembers": {
        if (!isListCategoryMembersArgs(args)) {
          throw new Error("Invalid arguments for listCategoryMembers");
        }
        const { category, limit } = args;
        const results = await listCategoryMembersMinecraftWiki(category, limit);
        console.log("Category members:", results);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      case "MinecraftWiki_getPageContent": {
        if (!isGetPageContentArgs(args)) {
          throw new Error("Invalid arguments for getPageContent");
        }
        const { title } = args;
        const content = await getPageContentMinecraftWiki(title);
        console.log("Page content:", content);
        return {
          content: [{ type: "text", text: content }],
          isError: false,
        };
      }

      case "MinecraftWiki_resolveRedirect": {
        if (!isResolveRedirectArgs(args)) {
          throw new Error("Invalid arguments for resolveRedirect");
        }
        const { title } = args;
        const resolvedTitle = await resolveRedirectMinecraftWiki(title);
        console.log("Resolved title:", resolvedTitle);
        return {
          content: [{ type: "text", text: resolvedTitle }],
          isError: false,
        };
      }

      case "MinecraftWiki_listAllCategories": {
        if (!isListAllCategoriesArgs(args)) {
          throw new Error("Invalid arguments for listAllCategories");
        }
        const { prefix, limit } = args;
        const results = await listAllCategoriesMinecraftWiki(prefix, limit);
        console.log("All categories:", results);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      case "MinecraftWiki_getCategoriesForPage": {
        if (!isGetCategoriesForPageArgs(args)) {
          throw new Error("Invalid arguments for getCategoriesForPage");
        }
        const { title } = args;
        const results = await getCategoriesForPageMinecraftWiki(title);
        console.log("Categories for page:", results);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      case "MinecraftWiki_getSectionsInPage": {
        if (!isGetSectionsInPageArgs(args)) {
          throw new Error("Invalid arguments for getSectionsInPage");
        }
        const { title } = args;
        const results = await getSectionsInPageMinecraftWiki(title);
        console.log("Sections in page:", results);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function listAllCategoriesMinecraftWiki(prefix?: string, limit: number = 10) {
  try {
    const response = await axios.get(WIKIMEDIA_API_URL, {
      params: {
        action: "query",
        format: "json",
        list: "allcategories",
        acprefix: prefix,
        aclimit: limit,
        origin: "*",
      },
    });

    const results = response.data.query.allcategories.map((item: any) => item["*"]);
    return results.join("\n");
  } catch (error) {
    throw new Error(
      `Error fetching all categories: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function getCategoriesForPageMinecraftWiki(title: string) {
  try {
    const response = await axios.get(WIKIMEDIA_API_URL, {
      params: {
        action: "query",
        format: "json",
        titles: title,
        prop: "categories",
        origin: "*",
      },
    });

    const pages = response.data.query.pages;
    const page = Object.values(pages)[0] as { categories?: [{ title: string }]; missing?: boolean };

    if (page.missing) {
      throw new Error(`Page "${title}" not found.`);
    }

    if (!page.categories) {
      return `No categories found for page "${title}"`;
    }

    const results = page.categories.map((item: any) => item.title);
    return results.join("\n");
  } catch (error) {
    throw new Error(
      `Error fetching categories for page: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function getSectionsInPageMinecraftWiki(title: string) {
  try {
    const response = await axios.get(WIKIMEDIA_API_URL, {
      params: {
        action: "parse",
        format: "json",
        page: title,
        prop: "sections",
        origin: "*",
      },
    });

    if (response.data.error) {
      throw new Error(`Error fetching sections for "${title}": ${response.data.error.info}`);
    }

    if (!response.data.parse || !response.data.parse.sections) {
      throw new Error(`Unexpected response structure for sections of "${title}"`);
    }

    const results = response.data.parse.sections.map(
      (item: any) => `Section ${item.index}: ${item.line}`
    );
    return results.join("\n");
  } catch (error) {
    throw new Error(
      `Error fetching sections for page: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Start the server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
