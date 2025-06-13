// admin/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/admin/",      // <-- вот эта строка!
  plugins: [react()],
});
