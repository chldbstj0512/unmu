import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { apiPlugin } from "./server/plugin.ts";

export default defineConfig({
  plugins: [react(), tailwindcss(), apiPlugin()],
  server: {
    host: "0.0.0.0",
    port: 4721,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4721,
    strictPort: true,
  },
});
