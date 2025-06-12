import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // оба эндпоинта бек-энда
      "/question": "http://localhost:8000",
      "/answer": "http://localhost:8000",
    },
  },
});
