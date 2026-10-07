/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {
    colors: {
      sakhi: { 50: "#fff1f3", 100: "#ffe0e5", 200: "#ffc2cc", 300: "#ff94a5", 400: "#ff6b84", 500: "#ff385c", 600: "#e31c5f", 700: "#c4123f", 800: "#3d3d3d", 900: "#222222" },
      warm: { 50: "#fff7ed", 100: "#ffedd5", 300: "#fdba74", 400: "#fb923c", 500: "#f97316", 600: "#ea580c" },
      cream: "#ffffff"
    },
    boxShadow: { soft: "0 1px 2px rgba(0,0,0,.08)", lift: "0 6px 20px rgba(0,0,0,.14)" }
  } },
  plugins: []
};
