/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    "airbnb/hooks",
    "airbnb-typescript",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:jsx-a11y/recommended",
    "next/core-web-vitals",
    "prettier/prettier",
  ],
  plugins: ["react"],
  ignorePatterns: ["node_modules", "dist", "src/generated.ts", "public"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  rules: {
    "react/jsx-filename-extension": [
      2,
      { extensions: [".js", ".jsx", ".ts", ".tsx"] },
    ],
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
    curly: ["error", "multi-line"],
    "no-unused-expressions": "error",
    "no-unsafe-optional-chaining": "error",
    "comma-dangle": ["error", "always-multiline"],
    semi: ["error", "always"],
    "brace-style": ["error"],
    "@typescript-eslint/indent": ["error", 2],
    "@typescript-eslint/quotes": ["error", "double"],
    "import/extensions": "off",
    "no-multiple-empty-lines": ["error", { max: 1 }],
    "no-trailing-spaces": "error",
    "no-multi-spaces": "error",
    "@typescript-eslint/no-use-before-define": "off",
    "jsx-a11y/no-static-element-interactions": "off",
    "no-irregular-whitespace": "error",
    "object-property-newline": [
      "error",
      { allowAllPropertiesOnSameLine: true },
    ],
    "semi-spacing": "error",
    "react/no-array-index-key": "warn",
  },
};
