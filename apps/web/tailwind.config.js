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
          primary: "#e2f5cb",
          "primary-content": "#65ad18",
          "secondary-soft": "#fff4e6",
          "secondary-content": "#ff9500",
          "neutral-button": "#acacac",
          "neutral-content": "#000000",
          neutral: "#ffffff",
          "neutral-soft-2": "#f1f1f1",
          "neutral-soft": "#eeeeee",
          "neutral-inverted-content": "#ffffff",
          "tertiary-soft": "#e5f7fa",
          "tertiary-content": "#2baac7",
          "error-button": "#eb4848",
          "error-content": "#eb4848",
          //additions:
          "neutral-soft-content": "#8c8c8c",
          "primary-hover-content": "#3e920f",
          "primary-soft": "#c7eb9a",
          "primary-button": "#65ad18",
          "error-hover-content": "#d03a3a",
          "error-soft": "#ffcfcf",
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
        "neutral-soft-content": "#8c8c8c",
        "neutral-button": "#acacac",
        "neutral-inverted-content": "#ffffff",
        "neutral-soft": "#eeeeee",
        "neutral-soft-2": "#f1f1f1",
        "secondary-soft": "#fff4e6",
        "tertiary-content": "#2baac7",
        "tertiary-soft": "#e5f7fa",
        "primary-hover-content": "#3e920f",
        "primary-button": "#65ad18",
        "primary-soft": "#c7eb9a",
        "error-hover-content": "#d03a3a",
        "error-button": "#eb4848",
        "error-soft": "#ffcfcf",
      },
      transitionProperty: {
        height: "height",
        spacing: "margin, padding",
      },
    },
  },
  plugins: [require("daisyui")],
};
