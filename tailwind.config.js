/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
