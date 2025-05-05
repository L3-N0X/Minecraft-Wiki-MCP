
# Minecraft Wiki MCP
[![smithery badge](https://smithery.ai/badge/@L3-N0X/Minecraft-Wiki-MCP)](https://smithery.ai/server/@L3-N0X/Minecraft-Wiki-MCP)
[![Verified on MseeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/f80cbb34-35d6-4652-a302-2413ffe60cb4)

A MCP Server for browsing the official Minecraft Wiki!

> [!WARNING]
> This MCP is still in development and while working most of the time, there might still be smaller issues and bugs left!

## Features

- **Wiki Search**: Find information about Minecraft structures, entities, items, and blocks
- **Page Navigation**: Get summaries and detailed content from wiki pages
- **Section Access**: Target specific sections within wiki pages
- **Category Browsing**: Explore wiki categories and their member pages
- **Multi-Language Support**: Connect to different language versions of the Minecraft Wiki

## Installation

Currently, only local installation is supported, other might follow!

### Installing via Smithery

To install Minecraft Wiki Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@L3-N0X/Minecraft-Wiki-MCP):

```bash
npx -y @smithery/cli install @L3-N0X/Minecraft-Wiki-MCP --client claude
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/L3-N0X/Minecraft-Wiki-MCP.git
cd Minecraft-Wiki-MCP

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
        "/path/to/your/dist/server.js", 
        "--api-url",
        "https://minecraft.wiki/api.php"
      ]
    }
  }
}
```

## Configuration

Make sure to update the path to the server.js file!
By default, this server connects to <https://minecraft.wiki/api.php> (English version). You can use a different wiki API URL by using the `api-url` option to access different language versions:

```json
{
  "mcpServers": {
    "minecraft-wiki": {
      "command": "node",
       "args": [
        "/path/to/your/dist/server.js", 
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
