import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/out/**",
      "**/next-env.d.ts",
      "packages/common/src/maps/london.ts"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Node 26 strip-types: pure types MUST be imported with `import type`.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      // Node strip-types cannot erase these constructs.
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSParameterProperty",
          message: "Parameter properties are unsupported by Node strip-types; declare fields explicitly."
        },
        {
          selector: "TSEnumDeclaration",
          message: "Enums are unsupported by Node strip-types; use a union type or const object."
        }
      ]
    }
  },
  {
    files: ["packages/server/**/*.ts", "packages/common/**/*.ts"],
    languageOptions: { globals: { ...globals.node } }
  },
  {
    files: ["packages/client/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Enums/param-properties are fine in the Next.js-compiled client
      "no-restricted-syntax": "off"
    }
  },
  {
    files: ["**/*.mjs", "**/*.js"],
    languageOptions: { globals: { ...globals.node } }
  }
);
