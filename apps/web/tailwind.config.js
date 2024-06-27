/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  daisyui: {
    themes: [
      {
        lightTheme: {
          primary: "#65ad18",
          "primary-content": "#65ad18",
          secondary: "#fff4e6",
          "secondary-content": "#ff9500",
          neutral: "#acacac",
          "neutral-content": "#000000",
          "base-100": "#ffffff",
          "base-200": "#f1f1f1",
          "base-300": "#eeeeee",
          "base-content": "#ffffff",
          info: "#e5f7fa",
          "info-content": "#2baac7",
          error: "#eb4848",
          "error-content": "#eb4848",
          //additions:
          "neutral-content-500": "#8c8c8c",
          "primary-hover": "#3e920f",
          "primary-50": "#c7eb9a",
          "primary-25": "#e2f5cb",
          "error-hover": "#d03a3a",
          "error-100": "#ffcfcf",
        },
      },
    ],
    darkTheme: false,
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root",
  },
  theme: {
    extend: {
      fontFamily: {
        press: ["var(--font-inter)"],
        chakra: ["var(--font-chakra)"],
      },
      colors: {
        //added color for the our daisy - lightTheme
        "neutral-content-500": "#8c8c8c",
        "primary-hover": "#3e920f",
        "primary-50": "#c7eb9a",
        "primary-25": "#e2f5cb",
        "error-hover": "#d03a3a",
        "error-100": "#ffcfcf",
      },
      transitionProperty: {
        height: "height",
        spacing: "margin, padding",
      },
    },
  },
  plugins: [require("daisyui")],
};
