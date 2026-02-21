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
    "next/core-web-vitals",
    "prettier/prettier",
  ],
  plugins: ["react", "jsx-a11y"],
  ignorePatterns: ["node_modules", "dist", "src/generated.ts", "public"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
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
    "no-unused-expressions": "error",
    "no-unsafe-optional-chaining": "error",
    "import/extensions": "off",
    "@typescript-eslint/quotes": ["error", "double", { avoidEscape: true }],
    "@typescript-eslint/no-use-before-define": "off",
    "jsx-a11y/no-static-element-interactions": "off",
    "react/no-array-index-key": "warn",
    indent: "off",
    "@typescript-eslint/indent": "off",
    "jsx-a11y/label-has-associated-control": "off",
    "@typescript-eslint/strict-boolean-expressions": [
      "warn",
      {
        allowString: true,
        allowNumber: true,
        allowNullableEnum: false,
        allowNullableObject: true,
        allowNullableBoolean: true,
        allowNullableString: true,
        allowNullableNumber: false,
        allowAny: true,
      },
    ],
  },
};
