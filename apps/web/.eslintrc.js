/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: ["next/core-web-vitals", "turbo", "prettier"],
  ignorePatterns: ["node_modules", "dist"],
  parserOptions: {
    babelOptions: {
      presets: [require.resolve("next/babel")],
    },
  },
  rules: {
    "react-hooks/exhaustive-deps": "off",
    "no-html-link-for-pages": "off",
  },
};
