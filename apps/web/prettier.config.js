/** @type {import("prettier").Config} */
const config = {
  plugins: [require.resolve("prettier-plugin-tailwindcss")],
  experimentalTernaries: true,
  jsxSingleQuote: false,
  singleQuote: false,
  trailingComma: "all",
  
};

module.exports = config;
