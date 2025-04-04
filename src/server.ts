#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import {
  SEARCH_WIKI_MINECRAFTWIKI_TOOL,
  GET_PAGE_SECTION_MINECRAFTWIKI_TOOL,
  LIST_CATEGORY_MEMBERS_MINECRAFTWIKI_TOOL,
  GET_PAGE_CONTENT_MINECRAFTWIKI_TOOL,
  RESOLVE_REDIRECT_MINECRAFTWIKI_TOOL,
  LIST_ALL_CATEGORIES_MINECRAFTWIKI_TOOL,
  GET_CATEGORIES_FOR_PAGE_MINECRAFTWIKI_TOOL,
  GET_SECTIONS_IN_PAGE_MINECRAFTWIKI_TOOL,
  GET_PAGE_SUMMARY_MINECRAFTWIKI_TOOL,
} from "./types/tools.js";

import {
  isSearchWikiArgs,
  isGetPageSectionArgs,
  isListCategoryMembersArgs,
  isGetPageContentArgs,
  isResolveRedirectArgs,
  isListAllCategoriesArgs,
  isGetCategoriesForPageArgs,
  isGetSectionsInPageArgs,
  isGetPageSummaryArgs,
} from "./types/guards.js";

import { wikiService } from "./services/wiki.service.js";

// Initialize the MCP server
const server = new Server(
  {
    name: "MinecraftWikiMCP",
    version: "1.0.0",
    description:
      "Interact with the Minecraft Wiki via the MediaWiki API. For best results: 1. Search for the basic entity/structure/etc name first, 2. Then use getPageSummary to see available sections, 3. Finally use getPageSection to get specific section content.",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    SEARCH_WIKI_MINECRAFTWIKI_TOOL,
    GET_PAGE_SUMMARY_MINECRAFTWIKI_TOOL,
    GET_SECTIONS_IN_PAGE_MINECRAFTWIKI_TOOL,
    GET_PAGE_SECTION_MINECRAFTWIKI_TOOL,
    GET_PAGE_CONTENT_MINECRAFTWIKI_TOOL,
    RESOLVE_REDIRECT_MINECRAFTWIKI_TOOL,
    LIST_CATEGORY_MEMBERS_MINECRAFTWIKI_TOOL,
    LIST_ALL_CATEGORIES_MINECRAFTWIKI_TOOL,
    GET_CATEGORIES_FOR_PAGE_MINECRAFTWIKI_TOOL,
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      case SEARCH_WIKI_MINECRAFTWIKI_TOOL.name: {
        if (!isSearchWikiArgs(args)) {
          throw new Error("Invalid arguments for searchWiki");
        }
        const results = await wikiService.searchWiki(args.query);
        console.log("Search results:", results);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      case GET_PAGE_SECTION_MINECRAFTWIKI_TOOL.name: {
        if (!isGetPageSectionArgs(args)) {
          throw new Error("Invalid arguments for getPageSection");
        }
        const section = await wikiService.getPageSection(args.title, args.sectionIndex);
        console.log("Section content:", section);
        return {
          content: [{ type: "text", text: section }],
          isError: false,
        };
      }

      case LIST_CATEGORY_MEMBERS_MINECRAFTWIKI_TOOL.name: {
        if (!isListCategoryMembersArgs(args)) {
          throw new Error("Invalid arguments for listCategoryMembers");
        }
        const results = await wikiService.listCategoryMembers(args.category, args.limit);
        console.log("Category members:", results);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      case GET_PAGE_CONTENT_MINECRAFTWIKI_TOOL.name: {
        if (!isGetPageContentArgs(args)) {
          throw new Error("Invalid arguments for getPageContent");
        }
        const content = await wikiService.getPageContent(args.title);
        console.log("Page content:", content);
        return {
          content: [{ type: "text", text: content }],
          isError: false,
        };
      }

      case RESOLVE_REDIRECT_MINECRAFTWIKI_TOOL.name: {
        if (!isResolveRedirectArgs(args)) {
          throw new Error("Invalid arguments for resolveRedirect");
        }
        const resolvedTitle = await wikiService.resolveRedirect(args.title);
        console.log("Resolved title:", resolvedTitle);
        return {
          content: [{ type: "text", text: resolvedTitle }],
          isError: false,
        };
      }

      case LIST_ALL_CATEGORIES_MINECRAFTWIKI_TOOL.name: {
        if (!isListAllCategoriesArgs(args)) {
          throw new Error("Invalid arguments for listAllCategories");
        }
        const results = await wikiService.listAllCategories(args.prefix, args.limit);
        console.log("All categories:", results);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      case GET_CATEGORIES_FOR_PAGE_MINECRAFTWIKI_TOOL.name: {
        if (!isGetCategoriesForPageArgs(args)) {
          throw new Error("Invalid arguments for getCategoriesForPage");
        }
        const results = await wikiService.getCategoriesForPage(args.title);
        console.log("Categories for page:", results);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      case GET_SECTIONS_IN_PAGE_MINECRAFTWIKI_TOOL.name: {
        if (!isGetSectionsInPageArgs(args)) {
          throw new Error("Invalid arguments for getSectionsInPage");
        }
        const results = await wikiService.getSectionsInPage(args.title);
        console.log("Sections in page:", results);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      case GET_PAGE_SUMMARY_MINECRAFTWIKI_TOOL.name: {
        if (!isGetPageSummaryArgs(args)) {
          throw new Error("Invalid arguments for getPageSummary");
        }
        const results = await wikiService.getPageSummary(args.title);
        console.log("Page summary:", results);
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

// Start the server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
