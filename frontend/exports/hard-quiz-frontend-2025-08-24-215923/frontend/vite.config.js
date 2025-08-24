import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    outDir: "../frontend/dist",
    emptyOutDir: true,
    sourcemap: true       // ← добавьте
  },
  server: {
    proxy: {
      "/question": "http://localhost:8000",
      "/answer": "http://localhost:8000",
    },
  },
});
