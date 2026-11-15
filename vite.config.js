import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import finnhubHandler from "./api/finnhub.js";

const STOCKSIGHT_PORT = 4000;
const FINNHUB_ROUTE = "/api/finnhub";

/**
 * Runs the real api/finnhub.js handler inside `npm run dev` and `npm run preview`, so local
 * requests go through the same allowlist, caching headers and 503 "no key" answer as on Vercel.
 * The handler reads FINNHUB_API_KEY from the server's environment; nothing reaches the bundle,
 * because Vite only exposes VITE_-prefixed variables to client code.
 */
function finnhubProxy() {
  const mount = server => {
    server.middlewares.use(FINNHUB_ROUTE, (req, res) => {
      const url = new URL(req.originalUrl ?? req.url ?? "/", "http://localhost");
      // Same shape as the vercel.json rewrite: the endpoint path arrives as `path`.
      const query = Object.fromEntries(url.searchParams);
      query.path = url.pathname.slice(FINNHUB_ROUTE.length).replace(/^\/+/, "");

      const response = {
        setHeader(name, value) { res.setHeader(name, value); return response; },
        status(code) { res.statusCode = code; return response; },
        json(payload) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(payload));
          return response;
        },
        send(body) { res.end(body); return response; },
      };

      finnhubHandler({ method: req.method, url: `${url.pathname}${url.search}`, query }, response).catch(() => {
        if (!res.headersSent) res.statusCode = 500;
        res.end();
      });
    });
  };
  return { name: "stocksight-finnhub-proxy", configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig(({ mode }) => {
  // Make FINNHUB_API_KEY from .env / .env.local available to the handler above (server only).
  const env = loadEnv(mode, process.cwd(), "");
  if (!process.env.FINNHUB_API_KEY && env.FINNHUB_API_KEY) process.env.FINNHUB_API_KEY = env.FINNHUB_API_KEY;

  return {
    plugins: [react(), tailwindcss(), finnhubProxy()],
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
  };
});
