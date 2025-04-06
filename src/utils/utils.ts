/**
 * Decodes Unicode escape sequences in a string
 */
export function decodeUnicodeEscapes(str: string): string {
  try {
    return JSON.parse(`"${str.replace(/"/g, '\\"')}"`);
  } catch {
    // If parsing fails, return the original string
    return str;
  }
}

/**
 * Completely sanitizes text for MCP compatibility by removing any potentially problematic characters
 */
export function formatMCPText(text: string): string {
  if (!text) return "";

  // Convert to simple ASCII only, removing special characters
  return (
    text
      // Replace any non-printable ASCII and extended characters with spaces
      .replace(/[^\x20-\x7E]/g, " ")
      //  Replace any special characters that might cause issues in MCP

      .replace(/[@^*"{}|<>]/g, "")
      // Remove any extra spaces created by replacements
      .replace(/\s+/g, " ")
      // Escape quotes and backslashes
      .replace(/"/g, "'")
      .replace(/\\/g, "/")
      // Ensure no leading/trailing whitespace
      .trim()
  );
}

/**
 * Creates a simplified text-only version of wiki content
 */
export function sanitizeWikiContent(text: string): string {
  return formatMCPText(
    // First decode any Unicode escapes
    decodeUnicodeEscapes(
      // Remove HTML tags
      text.replace(/<[^>]*>/g, " ")
    )
  );
}

/**
 * Creates an extremely simplified version of search results
 */
export function createSimpleSearchResult(
  results: Array<{ title: string; snippet: string }>
): string {
  if (!results || !results.length) return "No results found.";

  // Create a very simple list format
  return results
    .map((item, index) => {
      return `Result ${index + 1}: ${formatMCPText(item.title)}`;
    })
    .join(" | ");
}

/**
 * Creates a JSON-formatted search result response
 */
export function createJsonSearchResult(results: Array<{ title: string; snippet: string }>): string {
  if (!results || !results.length) return JSON.stringify({ results: [] });

  const formattedResults = results.map((item, index) => ({
    resultId: index + 1,
    title: formatMCPText(item.title),
    snippet: formatMCPText(item.snippet || "").substring(0, 100),
  }));

  return JSON.stringify({ results: formattedResults });
}

/**
 * Format sections for JSON response
 */
export function formatSectionsToJson(sections: Array<{ index: string; line: string }>): string {
  if (!sections || !sections.length) return JSON.stringify({ sections: [] });

  const formattedSections = sections.map((section) => ({
    index: parseInt(section.index),
    title: formatMCPText(section.line),
  }));

  return JSON.stringify({ sections: formattedSections });
}

/**
 * Format alerts for JSON response
 */
export function formatAlertsToJson(alerts: string[]): string {
  return JSON.stringify({ alerts: alerts.map((alert) => formatMCPText(alert)) });
}

/**
 * Format category members for JSON response
 */
export function formatCategoryMembersToJson(members: string[]): string {
  return JSON.stringify({ members: members.map((member) => formatMCPText(member)) });
}

/**
 * Format page summary for JSON response
 */
export function formatPageSummaryToJson(summary: string, sections: string): string {
  // Parse the sections string if it's in JSON format, otherwise use an empty array
  let parsedSections = [];
  try {
    const sectionData = JSON.parse(sections);
    parsedSections = sectionData.sections || [];
  } catch {
    // If parsing fails, use empty array
  }

  return JSON.stringify({
    summary: formatMCPText(summary.substring(0, 200)),
    sections: parsedSections,
  });
}
