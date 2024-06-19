/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  daisyui: {
    themes: false, // false: only light + dark | true: all themes | array: specific themes like this ["light", "dark", "cupcake"]
    darkTheme: false, // name of one of the included themes for dark mode
    base: true, // applies background color and foreground color for root element by default
    styled: true, // include daisyUI colors and design decisions for all components
    utils: true, // adds responsive and modifier utility classes
    prefix: "", // prefix for daisyUI classnames (components, modifiers and responsive class names. Not colors)
    logs: true, // Shows info about daisyUI version and used config in the console when building your CSS
    themeRoot: ":root", // The element that receives theme color CSS variables
  },
  theme: {
    content: [""],
    extend: {
      fontFamily: {
        press: ["var(--font-inter)"],
        chakra: ["var(--font-chakra)"],
      },
      colors: {
        primary: "var(--color-green-500)",
        secondary: "var(--color-orange-500)",
        surface: "var(--color-surface)",
        white: "var(--color-white)",
        black: "var(--color-black)",
        accent: "var(--color-accent)",
        red: "var(--color-red)",
        // new light color palette:
        neutral: "var(--color-grey-900)",
        neutralSoft: "var(--color-grey-500)",
        neutralButtonBg: "var(--color-grey-400)",
        neutralSoftBg: "var(--color-grey-200)",
        neutralSoft2Bg: "var(--color-grey-100)",
        neutralInverted: "var(--color-grey-0)",
        neutralBg: "var(--color-grey-0)",
        //
        primaryHover: "var(--color-green-600)",
        primaryButtonBg: "var(--color-green-500)",
        primarySoftBg: "var(--color-green-50)",
        primaryBg: "var(--color-green-25)",
        //
        warn: "var(--color-red-500)",
        warnHover: "var(--color-red-600)",
        warnButtonBg: "var(--color-red-500)",
        warnSoftBg: "var(--color-red-100)",
        //
        secondarySoftBg: "var(--color-orange-50)",
        //
        terciary: "var(--color-cyan-500)",
        terciarySoftBg: "var(--color-cyan-50)",
      },
      transitionProperty: {
        height: "height",
        spacing: "margin, padding",
      },
    },
  },
  plugins: [require("daisyui")],
};
