import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/swissquote": {
        target: "https://forex-data-feed.swissquote.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/swissquote/, ""),
      },
    },
  },
});