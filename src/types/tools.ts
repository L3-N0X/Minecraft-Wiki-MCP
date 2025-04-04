import { Tool } from "@modelcontextprotocol/sdk/types.js";

// Define tools
export const SEARCH_WIKI_MINECRAFTWIKI_TOOL: Tool = {
  name: "MinecraftWiki_searchWiki",
  description:
    "Search the Minecraft Wiki for a specific structure, entity, item or block. NOTE: Only use for basic search terms like item/block/structure/entity names - complex queries (like 'loot table of X' or 'how to craft Y') will not work. For best results: 1. Search for the basic entity/structure/etc name first, 2. Then use getPageSummary to see available sections, 3. Finally use getPageSection to get specific section content.",
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

export const GET_PAGE_SECTION_MINECRAFTWIKI_TOOL: Tool = {
  name: "MinecraftWiki_getPageSection",
  description:
    "Get a specific section from a Minecraft Wiki page. Should be used as step 3 after searching for the page and getting its summary. The section index corresponds to the order of sections on the page, starting with 0 for the main content, 1 for the first section, 2 for the second section, etc.",
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

export const LIST_CATEGORY_MEMBERS_MINECRAFTWIKI_TOOL: Tool = {
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
        description: "The maximum number of pages to return (default: 100, max: 500).",
      },
    },
    required: ["category"],
  },
};

export const GET_PAGE_CONTENT_MINECRAFTWIKI_TOOL: Tool = {
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

export const RESOLVE_REDIRECT_MINECRAFTWIKI_TOOL: Tool = {
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

export const LIST_ALL_CATEGORIES_MINECRAFTWIKI_TOOL: Tool = {
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

export const GET_CATEGORIES_FOR_PAGE_MINECRAFTWIKI_TOOL: Tool = {
  name: "MinecraftWiki_getCategoriesForPage",
  description: "Get categories associated with a specific page.",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the Minecraft Wiki page",
      },
    },
    required: ["title"],
  },
};

export const GET_SECTIONS_IN_PAGE_MINECRAFTWIKI_TOOL: Tool = {
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

export const GET_PAGE_SUMMARY_MINECRAFTWIKI_TOOL: Tool = {
  name: "MinecraftWiki_getPageSummary",
  description:
    "Step 2 of the recommended workflow: After finding a page through search, use this to get both the page summary AND a list of all available sections. This helps determine which specific section to retrieve next using getPageSection.",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the Minecraft Wiki page",
      },
    },
    required: ["title"],
  },
};
