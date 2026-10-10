/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#080A0F",
        surface: "#0D1017",
        elevated: "#121621",
        primary: "#7C5CFC",
        secondary: "#5E8BFF",
      },
    },
  },
  plugins: [],
};
