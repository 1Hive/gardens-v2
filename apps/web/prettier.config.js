/** @type {import("prettier").Config} */
const config = {
  trailingComma: "es5",
  semi: true,
  tabWidth: 2,
  singleQuote: false,
  jsxSingleQuote: false,
  plugins: ["prettier-plugin-tailwindcss"],
};

module.exports = config;
