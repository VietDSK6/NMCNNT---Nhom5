import { createRequire } from "node:module";

// typescript-eslint chưa hỗ trợ TypeScript 7 của Dashboard nên các công cụ lint nằm cô lập trong lint/ với TypeScript 6.
const require = createRequire(new URL("./lint/package.json", import.meta.url));
const js = require("@eslint/js");
const globals = require("globals");
const reactHooks = require("eslint-plugin-react-hooks");
const tseslint = require("typescript-eslint");

export default tseslint.config(
  { ignores: ["dist", "lint"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: { "react-hooks/rules-of-hooks": "error", "react-hooks/exhaustive-deps": "warn" },
  },
);
