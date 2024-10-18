/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: ["next/core-web-vitals", "turbo", "prettier"],
  ignorePatterns: ["node_modules", "dist"],
  // parserOptions: {
  //   babelOptions: {
  //     presets: [require.resolve("next/babel")],
  //   },
  // },
  rules: {
    "@typescript-eslint/no-deprecated": "off",
  },
};
