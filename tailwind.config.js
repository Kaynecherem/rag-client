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
          50: "#EBF5FB",
          100: "#D6EAF8",
          500: "#2E86C1",
          600: "#1B6CA8",
          700: "#1B4F72",
          800: "#154360",
          900: "#0E2F44",
        },
      },
    },
  },
  plugins: [],
};
