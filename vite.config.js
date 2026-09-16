import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/AppData/**',
        '**/Application Data/**',
        '**/Local Settings/**',
        '**/Roaming/**',
        '**/OneDrive/**',
        '**/.vscode/**',
        '**/.idea/**',
        '**/Thumbs.db',
        '**/.DS_Store',
        '**/ehthumbs.db',
        '**/desktop.ini',
      ],
      usePolling: false,
      useFsEvents: false,
    },
  },
});
