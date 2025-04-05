# Minecraft Wiki MCP

A MCP Server for browsing the official Minecraft Wiki!

## Features

- **Wiki Search**: Find information about Minecraft structures, entities, items, and blocks
- **Page Navigation**: Get summaries and detailed content from wiki pages
- **Section Access**: Target specific sections within wiki pages
- **Category Browsing**: Explore wiki categories and their member pages
- **Multi-Language Support**: Connect to different language versions of the Minecraft Wiki

## Installation

You can install and use this MCP server in several ways:

### Using NPX

```bash
npx @modelcontextprotocol/minecraft-wiki
```

### Using Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "minecraft-wiki": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/minecraft-wiki"
      ]
    }
  }
}
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/username/minecraft-wiki-mcp.git
cd minecraft-wiki-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

Then, you can use the server with this configuration in your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "minecraft-wiki": {
      "command": "node",
      "args": [
        "dist/server.js", 
        "--api-url",
        "https://minecraft.wiki/api.php"
      ]
    }
  }
}
```

## Configuration

By default, this server connects to <https://minecraft.wiki/api.php> (English version). You can use a different wiki API URL by using the `api-url` option to access different language versions:

```json
{
  "mcpServers": {
    "minecraft-wiki": {
      "command": "npx",
      "args": [
        "-y",
        "@L3-N0X/minecraft-wiki-mcp",
        "--api-url",
        "https://de.minecraft.wiki/api.php" // German version
      ]
    }
  }
}
```

## Available Tools

This server provides the following tools for interacting with the Minecraft Wiki:

### Search and Navigation

- `MinecraftWiki_searchWiki`: Search for structures, entities, items, or blocks
- `MinecraftWiki_getPageSummary`: Get page summary and list of available sections
- `MinecraftWiki_resolveRedirect`: Resolve redirect pages to their targets

### Page Content

- `MinecraftWiki_getPageContent`: Get full page content
- `MinecraftWiki_getPageSection`: Get specific section content
- `MinecraftWiki_getSectionsInPage`: Get overview of all sections in a page

### Categories

- `MinecraftWiki_listAllCategories`: List all available categories
- `MinecraftWiki_listCategoryMembers`: List pages within a category
- `MinecraftWiki_getCategoriesForPage`: Get categories for a specific page
