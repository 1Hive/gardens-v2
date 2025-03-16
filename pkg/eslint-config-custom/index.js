/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: ["prettier"],
  ignorePatterns: ["node_modules", "dist"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-deprecated": "off",
  },
};
