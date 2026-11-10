import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import { fixupPluginRules } from "@eslint/compat";
import drizzlePlugin from "eslint-plugin-drizzle";
import eslintPrettierConfig from "eslint-config-prettier";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node }, // browser নয়, node
  },
  tseslint.configs.recommended,
  {
    plugins: { drizzle: fixupPluginRules(drizzlePlugin) },
    // ঐচ্ছিক, তবে কাজের: where ছাড়া delete/update করলে error দেবে
    rules: {
      "drizzle/enforce-delete-with-where": ["error", { drizzleObjectName: ["db", "tx"] }],
      "drizzle/enforce-update-with-where": ["error", { drizzleObjectName: ["db", "tx"] }],
    },
  },
  eslintPrettierConfig, // সবার শেষে রাখবেন, যাতে formatting rule বন্ধ হয়
]);