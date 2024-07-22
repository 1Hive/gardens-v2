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
          primary: "#FCFFF7",
          "primary-content": "#65AD18",
          "secondary-soft": "#FFF4E6",
          "secondary-content": "#FF9500",
          "neutral-button": "#ACACAC",
          "neutral-content": "#252525",
          neutral: "#FFFFFF",
          "neutral-soft-2": "#F9F9F9",
          "neutral-soft": "#EEEEEE",
          "neutral-inverted-content": "#FFFFFF",
          "tertiary-soft": "#E5F7FA",
          "tertiary-content": "#2AAAE5",
          "accent": "#37CDFA",
          "danger-button": "#EB4848",
          "danger-content": "#EB4848",
          //additions:
          "neutral-soft-content": "#8C8C8C",
          "primary-hover-content": "#49A612",
          "primary-soft": "#EBFBD8",
          "primary-button": "#65AD18",
          "danger-hover-content": "#D03A3A",
          "danger-soft": "#FFE6E6",
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
        "neutral-soft-2": "#F9F9F9",
        "secondary-soft": "#FFF4E6",
        "tertiary-content": "#2AAAE5",
        "tertiary-soft": "#e5f7fa",
        "primary-hover-content": "#49A612",
        "primary-button": "#65ad18",
        "primary-soft": "#EBFBD8",
        "danger-hover-content": "#d03a3a",
        "danger-button": "#eb4848",
        "danger-content": "#EB4848",
        "danger-soft": "#FFE6E6",
      },
      transitionProperty: {
        height: "height",
        spacing: "margin, padding",
      },
    },
  },
  plugins: [require("daisyui")],
};
