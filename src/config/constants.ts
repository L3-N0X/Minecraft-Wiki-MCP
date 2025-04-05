// Default Minecraft Wiki API base URL
const DEFAULT_WIKIMEDIA_API_URL = "https://minecraft.wiki/api.php";

// Get custom API URL from command line args or use default
export const WIKIMEDIA_API_URL = process.argv.includes("--api-url")
  ? process.argv[process.argv.indexOf("--api-url") + 1]
  : DEFAULT_WIKIMEDIA_API_URL;
