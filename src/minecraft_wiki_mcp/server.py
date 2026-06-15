"""Minecraft Wiki MCP Server.

An MCP server that provides tools to search and browse the official Minecraft
Wiki.  Uses the MediaWiki API to fetch raw wikitext content which LLMs can
interpret natively.

Recommended workflow for LLMs:
  1. ``minecraft_wiki_search`` — find the page you're looking for
  2. ``minecraft_wiki_get_page`` — get the lead summary + section list
  3. ``minecraft_wiki_get_section`` — dive into a specific section

Transports:
  stdio             — default, for local MCP clients (Claude Desktop, Claude Code, etc.)
  streamable-http   — for remote/multi-client access over HTTP

Environment variables:
  MINECRAFT_WIKI_API_URL  — MediaWiki API endpoint (default: https://minecraft.wiki/api.php)
                            Change this to use a different language wiki, e.g.
                            https://de.minecraft.wiki/api.php for German.
  MINECRAFT_WIKI_HOST     — Host to bind for HTTP transport (default: 127.0.0.1)
  MINECRAFT_WIKI_PORT     — Port to bind for HTTP transport (default: 8000)
"""

from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass

import httpx
from mcp.server.fastmcp import Context, FastMCP
from mcp.server.session import ServerSession

from minecraft_wiki_mcp.models import (
    CategoriesInput,
    CategoryMembersInput,
    PageInput,
    RedirectInput,
    SearchInput,
    SectionInput,
)
from minecraft_wiki_mcp.wiki_client import WikiClient, WikiClientError

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

API_URL = os.environ.get("MINECRAFT_WIKI_API_URL", "https://minecraft.wiki/api.php")
HOST = os.environ.get("MINECRAFT_WIKI_HOST", "127.0.0.1")
PORT = int(os.environ.get("MINECRAFT_WIKI_PORT", "8000"))

# ---------------------------------------------------------------------------
# Lifespan — shared httpx client
# ---------------------------------------------------------------------------


@dataclass
class AppContext:
    """Lifespan context holding shared resources."""

    wiki: WikiClient


@asynccontextmanager
async def app_lifespan(server: FastMCP) -> AsyncIterator[AppContext]:
    """Create a shared httpx client that lives for the server's lifetime."""
    async with httpx.AsyncClient(
        timeout=30.0,
        headers={"User-Agent": "MinecraftWikiMCP/2.0 (httpx; MCP server)"},
    ) as client:
        wiki = WikiClient(api_url=API_URL, client=client)
        yield AppContext(wiki=wiki)


# ---------------------------------------------------------------------------
# Server instance
# ---------------------------------------------------------------------------

mcp = FastMCP(
    "minecraft_wiki_mcp",
    instructions=(
        "Minecraft Wiki MCP server — search and browse the official Minecraft Wiki. "
        "Recommended workflow: 1) Search for the item/block/entity/structure name, "
        "2) Get the page summary to see available sections, "
        "3) Read specific sections for detailed content. "
        "Content is returned as raw MediaWiki wikitext."
    ),
    lifespan=app_lifespan,
)

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _get_wiki(ctx: Context[ServerSession, AppContext]) -> WikiClient:
    """Extract the WikiClient from the request context."""
    return ctx.request_context.lifespan_context.wiki


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------


@mcp.tool(
    name="minecraft_wiki_search",
    annotations={
        "title": "Search Minecraft Wiki",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def search(params: SearchInput, ctx: Context[ServerSession, AppContext]) -> str:
    """Search the Minecraft Wiki for pages matching a query.

    Use simple item, block, entity, or structure names (e.g. 'Creeper',
    'Diamond Sword').  Complex queries like 'how to craft X' won't work —
    search for the item name, then read its page sections.

    Returns a JSON list of matching page titles with short text snippets.
    This is typically the first step: find the right page, then use
    ``minecraft_wiki_get_page`` to explore its content.
    """
    wiki = _get_wiki(ctx)
    try:
        results = await wiki.search(params.query, limit=params.limit)
    except WikiClientError as e:
        return f"Error: {e}"

    if not results:
        return json.dumps({"results": [], "message": f"No results found for '{params.query}'"})

    return json.dumps(
        {
            "results": [
                {"title": r.title, "snippet": r.snippet}
                for r in results
            ]
        },
        ensure_ascii=False,
    )


@mcp.tool(
    name="minecraft_wiki_get_page",
    annotations={
        "title": "Get Minecraft Wiki Page",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def get_page(params: PageInput, ctx: Context[ServerSession, AppContext]) -> str:
    """Get a Minecraft Wiki page's summary or full content.

    By default, returns the lead section (introduction) as wikitext plus a
    list of all page sections with their indices.  This helps you decide
    which section to read next with ``minecraft_wiki_get_section``.

    Set ``include_all_content=True`` to get the full page wikitext instead
    (can be very large for some pages).

    Redirects are resolved automatically.
    """
    wiki = _get_wiki(ctx)
    try:
        if params.include_all_content:
            page = await wiki.get_page_content(params.title)
            return json.dumps(
                {
                    "title": page.title,
                    "wikitext": page.wikitext,
                    "sections": [
                        {"index": s.index, "title": s.title, "level": s.level}
                        for s in page.sections
                    ],
                },
                ensure_ascii=False,
            )
        else:
            summary = await wiki.get_page_summary(params.title)
            return json.dumps(
                {
                    "title": summary.title,
                    "lead_summary": summary.lead_wikitext,
                    "sections": [
                        {"index": s.index, "title": s.title, "level": s.level}
                        for s in summary.sections
                    ],
                },
                ensure_ascii=False,
            )
    except WikiClientError as e:
        return f"Error: {e}"


@mcp.tool(
    name="minecraft_wiki_get_section",
    annotations={
        "title": "Get Wiki Page Section",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def get_section(
    params: SectionInput, ctx: Context[ServerSession, AppContext]
) -> str:
    """Get a specific section from a Minecraft Wiki page as raw wikitext.

    Use ``minecraft_wiki_get_page`` first to see available sections and
    their indices, then call this tool with the desired section index.

    Section 0 is the lead/intro section.  Subsequent sections are numbered
    sequentially.
    """
    wiki = _get_wiki(ctx)
    try:
        section = await wiki.get_section(params.title, params.section)
        return json.dumps(
            {
                "title": section.title,
                "section_index": section.section_index,
                "wikitext": section.wikitext,
            },
            ensure_ascii=False,
        )
    except WikiClientError as e:
        return f"Error: {e}"


@mcp.tool(
    name="minecraft_wiki_get_categories",
    annotations={
        "title": "Get Wiki Categories",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def get_categories(
    params: CategoriesInput, ctx: Context[ServerSession, AppContext]
) -> str:
    """Get categories for a page or browse available categories.

    Two modes:
    - If ``title`` is provided: returns the categories that page belongs to.
    - If ``prefix`` is provided (and no ``title``): lists categories matching
      that prefix (useful for browsing).
    - If neither is provided: lists categories without filtering.
    """
    wiki = _get_wiki(ctx)
    try:
        if params.title:
            categories = await wiki.get_categories_for_page(params.title)
            return json.dumps(
                {"title": params.title, "categories": categories},
                ensure_ascii=False,
            )
        else:
            categories = await wiki.list_categories(
                prefix=params.prefix, limit=params.limit
            )
            return json.dumps(
                {
                    "prefix": params.prefix,
                    "categories": categories,
                },
                ensure_ascii=False,
            )
    except WikiClientError as e:
        return f"Error: {e}"


@mcp.tool(
    name="minecraft_wiki_get_category_members",
    annotations={
        "title": "List Category Members",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def get_category_members(
    params: CategoryMembersInput, ctx: Context[ServerSession, AppContext]
) -> str:
    """List all pages belonging to a specific Minecraft Wiki category.

    Provide the category name without the 'Category:' prefix
    (e.g. 'Hostile mobs', 'Items', 'Blocks').
    """
    wiki = _get_wiki(ctx)
    try:
        members = await wiki.list_category_members(
            params.category, limit=params.limit
        )
        return json.dumps(
            {"category": params.category, "members": members},
            ensure_ascii=False,
        )
    except WikiClientError as e:
        return f"Error: {e}"


@mcp.tool(
    name="minecraft_wiki_resolve_redirect",
    annotations={
        "title": "Resolve Wiki Redirect",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def resolve_redirect(
    params: RedirectInput, ctx: Context[ServerSession, AppContext]
) -> str:
    """Resolve a page redirect to its target page title.

    Most other tools already resolve redirects automatically, but this tool
    is useful when you specifically need to know whether a title is a
    redirect and what it points to.
    """
    wiki = _get_wiki(ctx)
    try:
        result = await wiki.resolve_redirect(params.title)
        return json.dumps(
            {
                "original_title": result.original_title,
                "resolved_title": result.resolved_title,
                "is_redirect": result.is_redirect,
            },
            ensure_ascii=False,
        )
    except WikiClientError as e:
        return f"Error: {e}"


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------


def main() -> None:
    """Run the MCP server.

    Supports two transports selected via ``--transport``:

    stdio (default)
        For local MCP clients like Claude Desktop or Claude Code.
        Communication happens over stdin/stdout.

    streamable-http
        For remote or multi-client access over HTTP.
        Runs a stateless HTTP server on the configured host/port.
        Connect clients to ``http://<host>:<port>/mcp``.
    """
    import argparse

    parser = argparse.ArgumentParser(
        description="Minecraft Wiki MCP Server",
    )
    parser.add_argument(
        "--transport",
        choices=["stdio", "streamable-http"],
        default="stdio",
        help="Transport to use (default: stdio)",
    )
    args = parser.parse_args()

    if args.transport == "streamable-http":
        mcp.settings.host = HOST
        mcp.settings.port = PORT
        mcp.settings.stateless_http = True
        mcp.settings.json_response = True

        # Configure transport security (DNS rebinding protection)
        from mcp.server.transport_security import TransportSecuritySettings

        # Determine if security should be enabled
        enable_sec_env = os.environ.get("MINECRAFT_WIKI_ENABLE_SECURITY")
        if enable_sec_env is not None:
            enable_security = enable_sec_env.lower() in ("true", "1", "yes")
        else:
            # By default, only enable if host is localhost/loopback
            enable_security = HOST in ("127.0.0.1", "localhost", "::1")

        allowed_hosts_env = os.environ.get("MINECRAFT_WIKI_ALLOWED_HOSTS")
        if allowed_hosts_env:
            allowed_hosts = [h.strip() for h in allowed_hosts_env.split(",") if h.strip()]
        else:
            # Default allowed hosts
            allowed_hosts = [f"{HOST}:*", "127.0.0.1:*", "localhost:*", "[::1]:*"]

        allowed_origins_env = os.environ.get("MINECRAFT_WIKI_ALLOWED_ORIGINS")
        if allowed_origins_env:
            allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
        else:
            # Default allowed origins
            allowed_origins = [
                f"http://{HOST}:*",
                f"https://{HOST}:*",
                "http://127.0.0.1:*",
                "http://localhost:*",
                "http://[::1]:*",
            ]

        mcp.settings.transport_security = TransportSecuritySettings(
            enable_dns_rebinding_protection=enable_security,
            allowed_hosts=allowed_hosts,
            allowed_origins=allowed_origins,
        )

    mcp.run(transport=args.transport)


if __name__ == "__main__":
    main()
