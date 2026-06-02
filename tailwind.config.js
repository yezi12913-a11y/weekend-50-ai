/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      },
      colors: {
        cream: "#fff8e8",
        ink: "#24302f",
        leaf: "#3f7d58",
        mint: "#dff4e8",
        skysoft: "#dceeff",
        sun: "#ffd36a",
        peach: "#ffb88a"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(31, 43, 38, 0.10)"
      }
    }
  },
  plugins: []
};
