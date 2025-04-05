import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  // Console log is not allowed in production
  { files: ["**/*.{js,mjs,cjs,ts}"], rules: { "no-console": "error" } },
  // No console log in development
  { files: ["**/*.{js,mjs,cjs,ts}"], rules: { "no-console": "warn" } },
  // No unused variables
  { files: ["**/*.{js,mjs,cjs,ts}"], rules: { "no-unused-vars": "error" } },
  { files: ["**/*.{js,mjs,cjs,ts}"], languageOptions: { globals: globals.browser } },
  { files: ["**/*.{js,mjs,cjs,ts}"], plugins: { js }, extends: ["js/recommended"] },
  tseslint.configs.recommended,
]);
