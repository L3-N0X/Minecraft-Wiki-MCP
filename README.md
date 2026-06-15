# Minecraft Wiki MCP

An MCP Server for browsing the official Minecraft Wiki!

> [!WARNING]
> This is v2 — a complete Python rewrite. If you're upgrading from v1 (TypeScript), see the [migration notes](#migrating-from-v1) below.

## Features

- **Wiki Search** — Find information about Minecraft structures, entities, items, and blocks
- **Page Summaries** — Get a page's intro plus a table of contents to navigate further
- **Section Access** — Read specific sections as raw wikitext
- **Full Page Content** — Retrieve the entire page when you need everything
- **Category Browsing** — Explore wiki categories and their member pages
- **Redirect Resolution** — Follow redirects to find the canonical page
- **Multi-Language Support** — Connect to any language version of the Minecraft Wiki

## Requirements

- [Python 3.12+](https://www.python.org/)
- [uv](https://docs.astral.sh/uv/) (recommended package manager)

## Installation

### Quick Start with uv

```bash
# Clone the repository
git clone https://github.com/L3-N0X/Minecraft-Wiki-MCP.git
cd Minecraft-Wiki-MCP

# Install dependencies
uv sync

# Run the server
uv run minecraft-wiki-mcp
```

### With pip

```bash
pip install -e .
minecraft-wiki-mcp
```

## Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "minecraft-wiki": {
      "command": "uv",
      "args": [
        "--directory", "/path/to/Minecraft-Wiki-MCP",
        "run", "minecraft-wiki-mcp"
      ]
    }
  }
}
```

### Claude Code

```bash
claude mcp add minecraft-wiki -- uv --directory /path/to/Minecraft-Wiki-MCP run minecraft-wiki-mcp
```

### Multi-Language Support

By default, the server connects to the English wiki (`https://minecraft.wiki/api.php`).
Set the `MINECRAFT_WIKI_API_URL` environment variable to use a different language:

```json
{
  "mcpServers": {
    "minecraft-wiki": {
      "command": "uv",
      "args": [
        "--directory", "/path/to/Minecraft-Wiki-MCP",
        "run", "minecraft-wiki-mcp"
      ],
      "env": {
        "MINECRAFT_WIKI_API_URL": "https://de.minecraft.wiki/api.php"
      }
    }
  }
}
```

### Streamable HTTP Transport

By default, the server uses **stdio** transport (communication via stdin/stdout).
For remote or multi-client access, you can use **Streamable HTTP** transport:

```bash
# Start the HTTP server (default: http://127.0.0.1:8000/mcp)
uv run minecraft-wiki-mcp --transport streamable-http
```

Then connect clients to `http://127.0.0.1:8000/mcp`. For example, in Claude Code:

```bash
claude mcp add --transport http minecraft-wiki http://localhost:8000/mcp
```

Configure host, port, and security via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `MINECRAFT_WIKI_HOST` | `127.0.0.1` | Host to bind the HTTP server to |
| `MINECRAFT_WIKI_PORT` | `8000` | Port for the HTTP server |
| `MINECRAFT_WIKI_API_URL` | `https://minecraft.wiki/api.php` | MediaWiki API endpoint |
| `MINECRAFT_WIKI_ENABLE_SECURITY` | *Auto* | Enforce DNS rebinding protection (Host/Origin header check). Defaults to `true` if hosting on localhost/loopback, and `false` otherwise (e.g. when binding to `0.0.0.0` on a VPS). |
| `MINECRAFT_WIKI_ALLOWED_HOSTS` | *Auto* | Comma-separated list of allowed `Host` headers. (e.g. `mcp.example.com:*,123.45.67.89:*`). Only active if security is enabled. |
| `MINECRAFT_WIKI_ALLOWED_ORIGINS` | *Auto* | Comma-separated list of allowed `Origin` headers. (e.g. `https://mcp.example.com:*`). Only active if security is enabled. |

## Available Tools

### Search & Navigation

| Tool | Description |
|------|-------------|
| `minecraft_wiki_search` | Search for pages by name (items, blocks, entities, structures) |
| `minecraft_wiki_get_page` | Get page summary + section list, or full page content |
| `minecraft_wiki_get_section` | Read a specific section's raw wikitext |
| `minecraft_wiki_resolve_redirect` | Check if a title redirects and find the target |

### Categories

| Tool | Description |
|------|-------------|
| `minecraft_wiki_get_categories` | Get categories for a page, or browse categories by prefix |
| `minecraft_wiki_get_category_members` | List all pages in a category |

### Recommended Workflow

For best results, LLMs should follow this pattern:

1. **Search** — `minecraft_wiki_search` to find the right page
2. **Summarize** — `minecraft_wiki_get_page` to see the intro and available sections
3. **Deep dive** — `minecraft_wiki_get_section` to read specific sections

## Development

```bash
# Install dependencies
uv sync

# Run with the MCP Inspector for interactive testing
uv run mcp dev src/minecraft_wiki_mcp/server.py

# Syntax check
uv run python -m py_compile src/minecraft_wiki_mcp/server.py
```

## Migrating from v1

v2 is a complete rewrite from TypeScript to Python. Key changes:

| v1 Tool | v2 Tool | Notes |
|---------|---------|-------|
| `MinecraftWiki_searchWiki` | `minecraft_wiki_search` | Renamed |
| `MinecraftWiki_getPageSummary` | `minecraft_wiki_get_page` | Now includes section list |
| `MinecraftWiki_getPageContent` | `minecraft_wiki_get_page` | Use `include_all_content=true` |
| `MinecraftWiki_getSectionsInPage` | `minecraft_wiki_get_page` | Section list included in response |
| `MinecraftWiki_getPageSection` | `minecraft_wiki_get_section` | Returns wikitext instead of stripped HTML |
| `MinecraftWiki_getCategoriesForPage` | `minecraft_wiki_get_categories` | Pass `title` parameter |
| `MinecraftWiki_listAllCategories` | `minecraft_wiki_get_categories` | Pass `prefix` parameter |
| `MinecraftWiki_listCategoryMembers` | `minecraft_wiki_get_category_members` | Renamed |
| `MinecraftWiki_resolveRedirect` | `minecraft_wiki_resolve_redirect` | Renamed |

**Other breaking changes:**
- Configuration via `MINECRAFT_WIKI_API_URL` env var instead of `--api-url` CLI flag
- Runtime: Python 3.12+ with `uv` instead of Node.js
- Content is raw wikitext instead of HTML-stripped text
