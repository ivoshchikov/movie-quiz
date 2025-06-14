// файл: movie-quiz/frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",           // чтобы все пути к ассетам были абсолютными от корня
  plugins: [react()],
  build: {
    outDir: "../backend/static",  // ← сборка будет прямо в backend/static
    emptyOutDir: false,            // содержимое папки backend/static перед билдом очищается
    assetsDir: "assets",          // js/css попадут в backend/static/assets
  },
  server: {
    proxy: {
      "/question": "http://localhost:8000",
      "/answer":   "http://localhost:8000",
    },
  },
});
