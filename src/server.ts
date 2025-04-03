import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import axios from "axios";
import { z } from "zod";

// Initialize the MCP server
const server = new McpServer({
  name: "MinecraftWikiMCP",
  version: "1.0.0",
  description: "An MCP server that interacts with the Minecraft Wiki via Wikimedia API.",
});

// Wikimedia API base URL
const WIKIMEDIA_API_URL = "https://en.wikipedia.org/w/api.php";

// Tool: Search the Minecraft Wiki
server.tool(
  "searchWiki",
  { query: z.string() },
  async ({ query }) => {
    try {
      const response = await axios.get(WIKIMEDIA_API_URL, {
        params: {
          action: "query",
          format: "json",
          list: "search",
          srsearch: query,
        },
      });

      const results = response.data.query.search.map((item: any) => ({
        title: item.title,
        snippet: item.snippet.replace(/<[^>]*>/g, ""), // Remove HTML tags
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching search results: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Tool: Fetch page summary
server.tool(
  "getPageSummary",
  { title: z.string() },
  async ({ title }) => {
    try {
      const response = await axios.get(WIKIMEDIA_API_URL, {
        params: {
          action: "query",
          format: "json",
          prop: "extracts",
          exintro: true,
          titles: title,
        },
      });

      const pages = response.data.query.pages;
      const page = Object.values(pages)[0];

      if (page.missing) {
        return {
          content: [
            {
              type: "text",
              text: `Page "${title}" not found.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: page.extract,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching page summary: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Tool: Fetch specific sections of a page
server.tool(
  "getPageSection",
  { title: z.string(), sectionIndex: z.number() },
  async ({ title, sectionIndex }) => {
    try {
      const response = await axios.get(WIKIMEDIA_API_URL, {
        params: {
          action: "parse",
          format: "json",
          page: title,
          sectionindex: sectionIndex,
        },
      });

      if (response.data.error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching section ${sectionIndex} of "${title}": ${response.data.error.info}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: response.data.parse.text["*"].replace(/<[^>]*>/g, ""),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching page section: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Start the MCP server with stdio transport
const transport = new StdioServerTransport();
server.connect(transport).then(() => console.log("Minecraft Wiki MCP Server is running!"));