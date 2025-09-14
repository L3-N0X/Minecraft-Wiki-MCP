/**
 * Recipe extraction utility for parsing Minecraft crafting recipes from wiki content
 */

export interface RecipeIngredient {
  item: string;
  quantity: number;
}

export interface CraftingRecipe {
  ingredients: RecipeIngredient[];
  pattern?: string;
  recipe_type: 'shaped' | 'shapeless' | 'smelting' | 'brewing' | 'unknown';
  result?: {
    item: string;
    quantity: number;
  };
}

export interface RecipeExtractionResult {
  title: string;
  crafting_recipe?: CraftingRecipe;
  hasRecipe: boolean;
  sectionIndex?: number;
  content: string;
}

/**
 * Extract crafting recipe information from wiki content
 */
export function extractCraftingRecipe(content: string, title: string, sectionIndex?: number): RecipeExtractionResult {
  const result: RecipeExtractionResult = {
    title,
    hasRecipe: false,
    content,
    sectionIndex
  };

  // Check if this is likely a crafting section
  if (!isCraftingSection(content)) {
    return result;
  }

  try {
    const recipe = parseCraftingRecipe(content);
    if (recipe) {
      result.crafting_recipe = recipe;
      result.hasRecipe = true;
    }
  } catch (error) {
    // If parsing fails, continue without recipe data
    console.error(`Failed to parse recipe for ${title}:`, error);
  }

  return result;
}

/**
 * Check if the content appears to contain crafting recipe information
 */
function isCraftingSection(content: string): boolean {
  const craftingIndicators = [
    /crafting/i,
    /recipe/i,
    /ingredients/i,
    /{{[^}]*craft[^}]*}}/i, // MediaWiki crafting templates
    /<table[^>]*craft/i,
    /\|\s*[A-Za-z\s]+\s*\|\s*\d+/,  // Table format with quantities
    /<table[\s\S]*?ingredient[\s\S]*?<\/table>/i, // HTML table with ingredient column
    /<table[\s\S]*?quantity[\s\S]*?<\/table>/i, // HTML table with quantity column
    /<tr[\s\S]*?<td[\s\S]*?\d+[\s\S]*?<\/td>/i, // Table row with numeric values
    /\d+\s+[A-Za-z\s]+/,  // Pattern like "3 Obsidian" or "5 Glass"
  ];

  return craftingIndicators.some(indicator => indicator.test(content));
}

/**
 * Parse crafting recipe from wiki content
 */
function parseCraftingRecipe(content: string): CraftingRecipe | null {
  // Try different parsing strategies
  const recipe = parseFromTemplate(content) || 
                 parseFromTable(content) || 
                 parseFromText(content);

  return recipe;
}

/**
 * Parse recipe from MediaWiki crafting templates
 */
function parseFromTemplate(content: string): CraftingRecipe | null {
  // Look for common crafting templates like {{Crafting Table}} or {{Recipe}}
  const templateRegex = /{{[^}]*(?:craft|recipe)[^}]*\|([^}]+)}}/gi;
  const matches = content.match(templateRegex);

  if (!matches) return null;

  const ingredients: RecipeIngredient[] = [];
  let recipeType: 'shaped' | 'shapeless' | 'smelting' | 'brewing' | 'unknown' = 'shaped';

  for (const match of matches) {
    // Extract parameters from template
    const params = match.split('|').slice(1);
    
    for (const param of params) {
      const trimmed = param.trim();
      
      // Look for ingredient specifications like "A1=Nautilus Shell" or "item=8 Nautilus Shell"
      const ingredientMatch = trimmed.match(/^(?:[A-Z]\d|item|ingredient\d*)\s*=\s*(?:(\d+)\s*)?([^|}]+)$/i);
      if (ingredientMatch) {
        const quantity = ingredientMatch[1] ? parseInt(ingredientMatch[1]) : 1;
        const item = cleanItemName(ingredientMatch[2]);
        
        if (item) {
          // Check if ingredient already exists and update quantity
          const existingIngredient = ingredients.find(ing => ing.item === item);
          if (existingIngredient) {
            existingIngredient.quantity += quantity;
          } else {
            ingredients.push({ item, quantity });
          }
        }
      }
      
      // Check for shapeless indicator
      if (trimmed.toLowerCase().includes('shapeless')) {
        recipeType = 'shapeless';
      }
    }
  }

  if (ingredients.length === 0) return null;

  return {
    ingredients,
    recipe_type: recipeType,
    pattern: recipeType === 'shaped' ? 'Arranged in crafting grid' : undefined
  };
}

/**
 * Parse recipe from HTML table format
 */
function parseFromTable(content: string): CraftingRecipe | null {
  // Look for table rows with ingredient and quantity information
  const tableRowRegex = /<tr[^>]*>.*?<\/tr>/gi;
  const cellRegex = /<t[hd][^>]*>(.*?)<\/t[hd]>/gi;
  
  const rows = content.match(tableRowRegex) || [];
  const ingredients: RecipeIngredient[] = [];

  for (const row of rows) {
    const cells = [];
    let cellMatch;
    
    // Reset regex
    cellRegex.lastIndex = 0;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      cells.push(cellMatch[1].trim());
    }

    if (cells.length >= 2) {
      // Skip header rows
      const firstCell = cells[0].toLowerCase();
      if (firstCell.includes('ingredient') || firstCell.includes('item') || firstCell.includes('quantity')) {
        continue;
      }

      // Try to parse ingredient and quantity
      const possibleItem = cleanItemName(cells[0]);
      const possibleQuantity = extractQuantity(cells[1]) || extractQuantity(cells[0]);

      if (possibleItem && possibleItem.length > 2) { // Avoid single letters or very short strings
        const quantity = possibleQuantity || 1;
        
        // Check if ingredient already exists
        const existingIngredient = ingredients.find(ing => ing.item === possibleItem);
        if (existingIngredient) {
          existingIngredient.quantity += quantity;
        } else {
          ingredients.push({ item: possibleItem, quantity });
        }
      }
    }
  }

  if (ingredients.length === 0) return null;

  return {
    ingredients,
    recipe_type: 'shaped',
    pattern: 'Crafting table arrangement'
  };
}

/**
 * Parse recipe from plain text format
 */
function parseFromText(content: string): CraftingRecipe | null {
  const ingredients: RecipeIngredient[] = [];

  // Look for patterns like "8 Nautilus Shell + 1 Heart of the Sea"
  const ingredientPattern = /(\d+)\s+([A-Za-z\s]+?)(?:\s*\+|$|\.)/g;
  let match;

  while ((match = ingredientPattern.exec(content)) !== null) {
    const quantity = parseInt(match[1]);
    const item = cleanItemName(match[2]);

    if (item && quantity > 0) {
      const existingIngredient = ingredients.find(ing => ing.item === item);
      if (existingIngredient) {
        existingIngredient.quantity += quantity;
      } else {
        ingredients.push({ item, quantity });
      }
    }
  }

  // Also look for patterns without explicit quantities
  if (ingredients.length === 0) {
    const simplePattern = /(?:ingredients?[:\s]*|recipe[:\s]*)(.*?)(?:\n|$)/i;
    const simpleMatch = content.match(simplePattern);
    
    if (simpleMatch) {
      const ingredientText = simpleMatch[1];
      const items = ingredientText.split(/[+&,]/).map(item => cleanItemName(item)).filter(Boolean);
      
      for (const item of items) {
        ingredients.push({ item, quantity: 1 });
      }
    }
  }

  if (ingredients.length === 0) return null;

  // Determine if it's shapeless based on content
  const isShapeless = /shapeless/i.test(content);

  return {
    ingredients,
    recipe_type: isShapeless ? 'shapeless' : 'shaped',
    pattern: isShapeless ? 'Any arrangement' : 'Specific pattern required'
  };
}

/**
 * Clean and normalize item names
 */
function cleanItemName(name: string): string {
  if (!name) return '';
  
  return name
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g, '$1') // MediaWiki links [[item|display]] -> item
    .replace(/{{[^}]*}}/g, '') // Remove templates
    .replace(/[{}[\]]/g, '') // Remove remaining brackets
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Extract quantity from text
 */
function extractQuantity(text: string): number | null {
  if (!text) return null;
  
  const quantityMatch = text.match(/(\d+)/);
  return quantityMatch ? parseInt(quantityMatch[1]) : null;
}

/**
 * Enhanced content sanitization that preserves recipe information
 */
export function sanitizeWikiContentWithRecipes(text: string): string {
  // Preserve some structure that's useful for recipe parsing before general sanitization
  let processed = text
    // Preserve template structure temporarily
    .replace(/{{([^}]+)}}/g, '{{$1}}')
    // Preserve table structure temporarily
    .replace(/<table[^>]*>/gi, '<TABLE>')
    .replace(/<\/table>/gi, '</TABLE>')
    .replace(/<tr[^>]*>/gi, '<TR>')
    .replace(/<\/tr>/gi, '</TR>')
    .replace(/<t[hd][^>]*>/gi, '<TD>')
    .replace(/<\/t[hd]>/gi, '</TD>');

  // Then apply standard sanitization but preserve our markers
  processed = processed
    .replace(/<[^>]*>/g, ' ') // Remove other HTML tags
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  return processed;
}