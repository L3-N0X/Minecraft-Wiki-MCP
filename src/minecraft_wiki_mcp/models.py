"""Pydantic models for tool input validation."""

from pydantic import BaseModel, ConfigDict, Field


class SearchInput(BaseModel):
    """Input for searching the Minecraft Wiki."""

    model_config = ConfigDict(str_strip_whitespace=True)

    query: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description=(
            "Search term to find on the Minecraft Wiki. Use simple item, block, "
            "entity, or structure names (e.g. 'Creeper', 'Diamond Sword', "
            "'Nether Portal'). Complex queries like 'how to craft X' won't work "
            "— search for the item name, then read its page sections."
        ),
    )
    limit: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Maximum number of search results to return.",
    )


class PageInput(BaseModel):
    """Input for retrieving a wiki page."""

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description="Exact title of the Minecraft Wiki page (e.g. 'Creeper', 'Diamond Sword').",
    )
    include_all_content: bool = Field(
        default=False,
        description=(
            "If True, return the full page wikitext content. "
            "If False (default), return only the lead section summary and a list "
            "of available sections — this is usually the best starting point."
        ),
    )


class SectionInput(BaseModel):
    """Input for retrieving a specific page section."""

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description="Exact title of the Minecraft Wiki page.",
    )
    section: int = Field(
        ...,
        ge=0,
        description=(
            "Section index to retrieve. Use 0 for the lead/intro section. "
            "Get the section list first via minecraft_wiki_get_page to find the "
            "correct index."
        ),
    )


class CategoriesInput(BaseModel):
    """Input for browsing categories or getting a page's categories."""

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(
        default=None,
        max_length=300,
        description=(
            "Page title to get categories for. If provided, returns categories "
            "that this page belongs to."
        ),
    )
    prefix: str | None = Field(
        default=None,
        max_length=200,
        description=(
            "Filter prefix for browsing all categories. If provided (and no "
            "title), returns categories matching this prefix."
        ),
    )
    limit: int = Field(
        default=50,
        ge=1,
        le=500,
        description="Maximum number of categories to return (only used when browsing by prefix).",
    )


class CategoryMembersInput(BaseModel):
    """Input for listing pages in a category."""

    model_config = ConfigDict(str_strip_whitespace=True)

    category: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description=(
            "Category name without the 'Category:' prefix "
            "(e.g. 'Hostile mobs', 'Items', 'Blocks')."
        ),
    )
    limit: int = Field(
        default=100,
        ge=1,
        le=500,
        description="Maximum number of pages to return.",
    )


class RedirectInput(BaseModel):
    """Input for resolving a redirect."""

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description="Title of the page that may be a redirect.",
    )
