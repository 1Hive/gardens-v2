/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: [
    "next/core-web-vitals",
    "turbo",
    "prettier",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  ignorePatterns: ["node_modules", "dist", "src/generated.ts", "public"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  rules: {
    "react-hooks/exhaustive-deps": "off",
    "@next/next/no-html-link-for-pages": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@next/next/no-page-custom-font": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "react/self-closing-comp": [
      "error",
      {
        component: true,
        html: true,
      },
    ],
    "no-unreachable": "warn",
    "import/order": [
      "error",
      {
        groups: ["builtin", "external", "internal"],
        pathGroups: [
          {
            pattern: "react",
            group: "external",
            position: "before",
          },
        ],
        pathGroupsExcludedImportTypes: ["react"],
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
    "no-console": [
      "warn",
      {
        allow: ["warn", "error", "info", "debug", "table"],
      },
    ],
    "prefer-const": "off",
    "@typescript-eslint/consistent-type-definitions": "off",
    curly: "error",
    "no-unused-expressions": "error",
    "no-unsafe-optional-chaining": "error",
    "comma-dangle": ["error", "always-multiline"],
    semi: ["error", "always"],
    "brace-style": "error",
    indent: ["error", 2],
  },
};
