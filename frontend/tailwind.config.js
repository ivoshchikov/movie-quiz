/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},            // вся палитра v3 доступна «из коробки»
  },
  plugins: [
    require("@tailwindcss/typography"),  // ← добавили плагин
  ],
};
