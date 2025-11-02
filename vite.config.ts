import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const https =
    env.VITE_HTTPS === "true"
      ? {
        key: fs.readFileSync(env.VITE_SSL_KEY),
        cert: fs.readFileSync(env.VITE_SSL_CERT),
      }
      : undefined;

  return {
    plugins: [react()],
    server: {
      https,
      host: true,
      port: parseInt(env.VITE_PORT || "5000"),
      hmr: {
        protocol: "wss",
        clientPort: parseInt(env.VITE_PORT || "5000"),
      },
      proxy: {
        // Proxy WS upgrades from the browser path /rosbridge -> rosbridge ws server
        '^/rosbridge': {
          target: 'ws://127.0.0.1:9090',
          ws: true,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/rosbridge/, ''),
        },
      },
    },
  };
});
