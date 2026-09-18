import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const STOCKSIGHT_PORT = 4000;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: STOCKSIGHT_PORT,
    strictPort: true,
    proxy: {
      // Yahoo's chart API does not consistently allow browser CORS requests.
      "/api/yahoo-finance": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo-finance/, ""),
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: STOCKSIGHT_PORT,
    strictPort: true,
  },
});
