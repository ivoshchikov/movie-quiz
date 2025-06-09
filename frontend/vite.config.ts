// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../backend/static",   // складываем файлы прямо в FastAPI-статику
    emptyOutDir: false,            // ⚠️ НЕ очищаем всю папку (иначе сотрутся /posters)
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
