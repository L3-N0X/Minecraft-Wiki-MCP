// Type guards for API arguments validation
export function isSearchWikiArgs(args: unknown): args is { query: string } {
  return (
    typeof args === "object" &&
    args !== null &&
    "query" in args &&
    typeof (args as { query: string }).query === "string"
  );
}

export function isGetPageSectionArgs(
  args: unknown
): args is { title: string; sectionIndex: number } {
  return (
    typeof args === "object" &&
    args !== null &&
    "title" in args &&
    typeof (args as { title: string }).title === "string" &&
    "sectionIndex" in args &&
    typeof (args as { sectionIndex: number }).sectionIndex === "number"
  );
}

export function isListCategoryMembersArgs(
  args: unknown
): args is { category: string; limit?: number } {
  return (
    typeof args === "object" &&
    args !== null &&
    "category" in args &&
    typeof (args as { category: string }).category === "string" &&
    ("limit" in args ? typeof (args as { limit: number }).limit === "number" : true)
  );
}

export function isGetPageContentArgs(args: unknown): args is { title: string } {
  return (
    typeof args === "object" &&
    args !== null &&
    "title" in args &&
    typeof (args as { title: string }).title === "string"
  );
}

export function isResolveRedirectArgs(args: unknown): args is { title: string } {
  return (
    typeof args === "object" &&
    args !== null &&
    "title" in args &&
    typeof (args as { title: string }).title === "string"
  );
}

export function isListAllCategoriesArgs(
  args: unknown
): args is { prefix?: string; limit?: number } {
  return (
    typeof args === "object" &&
    args !== null &&
    ("prefix" in args ? typeof (args as { prefix: string }).prefix === "string" : true) &&
    ("limit" in args ? typeof (args as { limit: number }).limit === "number" : true)
  );
}

export function isGetCategoriesForPageArgs(args: unknown): args is { title: string } {
  return (
    typeof args === "object" &&
    args !== null &&
    "title" in args &&
    typeof (args as { title: string }).title === "string"
  );
}

export function isGetSectionsInPageArgs(args: unknown): args is { title: string } {
  return (
    typeof args === "object" &&
    args !== null &&
    "title" in args &&
    typeof (args as { title: string }).title === "string"
  );
}

export function isGetPageSummaryArgs(args: unknown): args is { title: string } {
  return (
    typeof args === "object" &&
    args !== null &&
    "title" in args &&
    typeof (args as { title: string }).title === "string"
  );
}
