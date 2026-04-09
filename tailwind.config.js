/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "rgb(var(--color-page) / <alpha-value>)",
        card: "rgb(var(--color-card) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "border-default": "rgb(var(--color-border) / <alpha-value>)",
        "input-border": "rgb(var(--color-input-border) / <alpha-value>)",
        heading: "rgb(var(--color-heading) / <alpha-value>)",
        body: "rgb(var(--color-body) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        faint: "rgb(var(--color-faint) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-hover": "rgb(var(--color-accent-hover) / <alpha-value>)",
        "on-accent": "rgb(var(--color-on-accent) / <alpha-value>)",
        "primary-btn": "rgb(var(--color-primary-btn) / <alpha-value>)",
        "primary-btn-hover": "rgb(var(--color-primary-btn-hover) / <alpha-value>)",
        overlay: "rgb(var(--color-overlay) / <alpha-value>)",
        brand: {
          50: "#FAF8F4",
          100: "#F1F1F1",
          200: "#E9EAEA",
          300: "#EDEDED",
          400: "#A7AAAA",
          500: "#656B6B",
          600: "#2C3030",
          700: "#1A1A1A",
          800: "#161415",
          900: "#0E0E0E",
          accent: "#FF7D55",
        },
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        sans: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
