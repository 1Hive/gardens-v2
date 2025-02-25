module.exports = {
  extends: ["turbo", "prettier"],
  ignorePatterns: ["node_modules", "dist"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-deprecated": "off",
  },
};
