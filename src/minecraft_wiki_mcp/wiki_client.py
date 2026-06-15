"""MediaWiki API client for the Minecraft Wiki.

This module wraps all interaction with the MediaWiki API, providing typed
return values and automatic redirect resolution.  It is designed so that a
future content-processing layer (e.g. a wikitext → Markdown converter) can
be plugged in with minimal changes.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

logger = logging.getLogger(__name__)

DEFAULT_API_URL = "https://minecraft.wiki/api.php"

# ---------------------------------------------------------------------------
# Data classes for typed return values
# ---------------------------------------------------------------------------


@dataclass
class SearchResult:
    """A single search hit from the wiki."""

    title: str
    snippet: str


@dataclass
class SectionInfo:
    """Metadata for a single page section."""

    index: int
    title: str
    level: int


@dataclass
class PageSummary:
    """Lead-section wikitext plus section table-of-contents for a page."""

    title: str
    lead_wikitext: str
    sections: list[SectionInfo] = field(default_factory=list)


@dataclass
class PageContent:
    """Full page wikitext content."""

    title: str
    wikitext: str
    sections: list[SectionInfo] = field(default_factory=list)


@dataclass
class SectionContent:
    """Wikitext content of a single section."""

    title: str
    section_index: int
    wikitext: str


@dataclass
class RedirectResult:
    """Result of a redirect resolution."""

    original_title: str
    resolved_title: str
    is_redirect: bool


# ---------------------------------------------------------------------------
# Wiki client
# ---------------------------------------------------------------------------


class WikiClientError(Exception):
    """Raised when a wiki API request fails."""


class WikiClient:
    """Async client for the MediaWiki API.

    Parameters
    ----------
    api_url:
        Full URL to the MediaWiki ``api.php`` endpoint.
    client:
        An ``httpx.AsyncClient`` instance to use for requests.  Passed in
        from the server lifespan so connections are pooled across requests.
    """

    def __init__(self, api_url: str, client: httpx.AsyncClient) -> None:
        self.api_url = api_url
        self._client = client

    # -- helpers -------------------------------------------------------------

    async def _request(
        self, params: dict[str, Any], method: str = "GET"
    ) -> dict[str, Any]:
        """Execute a MediaWiki API request and return the JSON body."""
        params = {**params, "format": "json", "formatversion": "2"}
        try:
            if method.upper() == "POST":
                resp = await self._client.post(self.api_url, data=params)
            else:
                resp = await self._client.get(self.api_url, params=params)
            resp.raise_for_status()
            data: dict[str, Any] = resp.json()
        except httpx.HTTPStatusError as exc:
            raise WikiClientError(
                f"Wiki API returned HTTP {exc.response.status_code}"
            ) from exc
        except httpx.RequestError as exc:
            raise WikiClientError(
                f"Wiki API request failed: {exc}"
            ) from exc

        if "error" in data:
            info = data["error"].get("info", "Unknown error")
            raise WikiClientError(f"Wiki API error: {info}")

        return data

    async def expand_templates(self, text: str, title: str) -> str:
        """Expand templates, parser functions, and variables in wikitext.

        Uses ``action=expandtemplates``.
        """
        data = await self._request(
            {
                "action": "expandtemplates",
                "title": title,
                "text": text,
                "prop": "wikitext",
            },
            method="POST",
        )
        return data.get("expandtemplates", {}).get("wikitext", "")

    # -- public API ----------------------------------------------------------

    async def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        """Search the wiki and return a list of matching pages.

        Uses ``action=query&list=search``.
        """
        data = await self._request(
            {"action": "query", "list": "search", "srsearch": query, "srlimit": limit}
        )
        results = data.get("query", {}).get("search", [])
        return [
            SearchResult(
                title=r["title"],
                snippet=_strip_html_tags(r.get("snippet", "")),
            )
            for r in results
        ]

    async def get_page_summary(self, title: str) -> PageSummary:
        """Get the lead section wikitext and section list for a page.

        Automatically resolves redirects.
        """
        # Fetch lead section wikitext
        lead_data = await self._request(
            {
                "action": "parse",
                "page": title,
                "prop": "wikitext|sections",
                "section": 0,
                "redirects": 1,
            }
        )

        parse = lead_data.get("parse", {})
        resolved_title = parse.get("title", title)
        lead_wikitext = parse.get("wikitext", "")
        if lead_wikitext:
            lead_wikitext = await self.expand_templates(lead_wikitext, resolved_title)

        # The sections from section=0 only gives us the lead section metadata.
        # We need a separate call to get all sections.
        sections = await self.get_sections_list(resolved_title)

        return PageSummary(
            title=resolved_title,
            lead_wikitext=lead_wikitext,
            sections=sections,
        )

    async def get_page_content(self, title: str) -> PageContent:
        """Get the full wikitext content of a page.

        Automatically resolves redirects.
        """
        data = await self._request(
            {
                "action": "parse",
                "page": title,
                "prop": "wikitext|sections",
                "redirects": 1,
            }
        )

        parse = data.get("parse", {})
        resolved_title = parse.get("title", title)
        wikitext = parse.get("wikitext", "")
        if wikitext:
            wikitext = await self.expand_templates(wikitext, resolved_title)

        sections = [
            SectionInfo(
                index=int(s.get("index", 0)),
                title=s.get("line", ""),
                level=int(s.get("level", 2)),
            )
            for s in parse.get("sections", [])
        ]

        return PageContent(
            title=resolved_title,
            wikitext=wikitext,
            sections=sections,
        )

    async def get_section(self, title: str, section_index: int) -> SectionContent:
        """Get the wikitext content of a specific section.

        Parameters
        ----------
        title:
            Page title.
        section_index:
            Section index (0 = lead, 1 = first section, …).  Use
            :meth:`get_sections_list` to discover available indices.
        """
        data = await self._request(
            {
                "action": "parse",
                "page": title,
                "prop": "wikitext",
                "section": section_index,
                "redirects": 1,
            }
        )

        parse = data.get("parse", {})
        resolved_title = parse.get("title", title)
        wikitext = parse.get("wikitext", "")
        if wikitext:
            wikitext = await self.expand_templates(wikitext, resolved_title)

        return SectionContent(
            title=resolved_title,
            section_index=section_index,
            wikitext=wikitext,
        )

    async def get_sections_list(self, title: str) -> list[SectionInfo]:
        """Get the table-of-contents section list for a page."""
        data = await self._request(
            {
                "action": "parse",
                "page": title,
                "prop": "sections",
                "redirects": 1,
            }
        )

        sections_raw = data.get("parse", {}).get("sections", [])
        return [
            SectionInfo(
                index=int(s.get("index", 0)),
                title=s.get("line", ""),
                level=int(s.get("level", 2)),
            )
            for s in sections_raw
        ]

    async def get_categories_for_page(self, title: str) -> list[str]:
        """Get the categories a page belongs to."""
        data = await self._request(
            {
                "action": "query",
                "titles": title,
                "prop": "categories",
                "cllimit": "max",
                "redirects": 1,
            }
        )

        pages = data.get("query", {}).get("pages", [])
        if not pages:
            raise WikiClientError(f"Page '{title}' not found")

        page = pages[0]
        if page.get("missing", False):
            raise WikiClientError(f"Page '{title}' not found")

        return [cat["title"] for cat in page.get("categories", [])]

    async def list_categories(
        self, prefix: str | None = None, limit: int = 50
    ) -> list[str]:
        """List categories on the wiki, optionally filtered by prefix."""
        params: dict[str, Any] = {
            "action": "query",
            "list": "allcategories",
            "aclimit": limit,
        }
        if prefix:
            params["acprefix"] = prefix

        data = await self._request(params)

        categories = data.get("query", {}).get("allcategories", [])
        return [cat["category"] for cat in categories]

    async def list_category_members(
        self, category: str, limit: int = 100
    ) -> list[str]:
        """List pages belonging to a category.

        Parameters
        ----------
        category:
            Category name *without* the ``Category:`` prefix.
        """
        data = await self._request(
            {
                "action": "query",
                "list": "categorymembers",
                "cmtitle": f"Category:{category}",
                "cmlimit": limit,
            }
        )

        members = data.get("query", {}).get("categorymembers", [])
        return [m["title"] for m in members]

    async def resolve_redirect(self, title: str) -> RedirectResult:
        """Resolve a page title, following any redirects."""
        data = await self._request(
            {
                "action": "query",
                "titles": title,
                "redirects": 1,
            }
        )

        query = data.get("query", {})
        redirects = query.get("redirects", [])
        pages = query.get("pages", [])

        if not pages:
            raise WikiClientError(f"Page '{title}' not found")

        page = pages[0]
        if page.get("missing", False):
            raise WikiClientError(f"Page '{title}' not found")

        resolved_title = page["title"]
        is_redirect = len(redirects) > 0

        return RedirectResult(
            original_title=title,
            resolved_title=resolved_title,
            is_redirect=is_redirect,
        )


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

import re

_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html_tags(text: str) -> str:
    """Strip HTML tags from a string.

    Used only for search snippet cleanup — the MediaWiki search API returns
    snippets with ``<span class="searchmatch">`` highlighting tags.
    """
    return _HTML_TAG_RE.sub("", text)
