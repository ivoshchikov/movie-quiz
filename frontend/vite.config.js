// файл: movie-quiz/frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",           // чтобы все пути к ассетам были абсолютными от корня
  plugins: [react()],
  build: {
    outDir: "../frontend/dist",  // ← сборка будет прямо в backend/static
    emptyOutDir: true,            
  },
  server: {
    proxy: {
      "/question": "http://localhost:8000",
      "/answer":   "http://localhost:8000",
    },
  },
});
