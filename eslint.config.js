import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        chrome: "readonly",
      },
    },
  },
  {
    files: ["eslint.config.js", "scripts/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: ["node_modules/", "fonts/"],
  },
];
