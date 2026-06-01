import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  let https: { key: Buffer; cert: Buffer } | undefined;
  if (env.VITE_HTTPS === "true" && env.VITE_SSL_KEY_PATH && env.VITE_SSL_CERT_PATH) {
    try {
      https = {
        key: fs.readFileSync(env.VITE_SSL_KEY_PATH),
        cert: fs.readFileSync(env.VITE_SSL_CERT_PATH),
      };
    } catch {
      console.warn(
        "[vite] HTTPS requested but cert/key files not found. Run with HTTP. Set VITE_HTTPS=false or add certs to VITE_SSL_KEY_PATH / VITE_SSL_CERT_PATH."
      );
    }
  }

  return {
    plugins: [react()],
    server: {
      https,
      host: true,
      port: parseInt(env.VITE_PORT || "5000"),
      hmr: https
        ? { protocol: "wss", clientPort: parseInt(env.VITE_PORT || "5000") }
        : undefined,
      proxy: {
        "^/rosbridge": {
          target: "ws://127.0.0.1:9090",
          ws: true,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/rosbridge/, ""),
        },
      },
    },
  };
});
