import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // VITE_HTTPS=true must serve https: missing paths or unreadable certs are a
  // hard error, not a silent fall back to http.
  let https: { key: Buffer; cert: Buffer } | undefined;
  if (env.VITE_HTTPS === "true") {
    if (!env.VITE_SSL_KEY_PATH || !env.VITE_SSL_CERT_PATH) {
      throw new Error(
        "[vite] VITE_HTTPS=true but VITE_SSL_KEY_PATH / VITE_SSL_CERT_PATH are not set. " +
          "Set both to your cert/key paths, or set VITE_HTTPS=false."
      );
    }
    try {
      https = {
        key: fs.readFileSync(env.VITE_SSL_KEY_PATH),
        cert: fs.readFileSync(env.VITE_SSL_CERT_PATH),
      };
    } catch {
      throw new Error(
        `[vite] VITE_HTTPS=true but the cert/key files could not be read ` +
          `(cert: ${env.VITE_SSL_CERT_PATH}, key: ${env.VITE_SSL_KEY_PATH}). ` +
          "Add the certificates, or set VITE_HTTPS=false."
      );
    }
  }

  // Vite 5.4.12+ blocks requests whose host header isn't whitelisted, which breaks reverse proxies (e.g. Caddy).
  // Allow the public host from the env.
  const allowedHosts = env.VITE_ALLOWED_HOST
    ? env.VITE_ALLOWED_HOST.split(",").map((h) => h.trim()).filter(Boolean)
    : undefined;

  return {
    plugins: [react()],
    server: {
      https,
      host: true,
      allowedHosts,
      port: parseInt(env.VITE_PORT || "5000"),
      hmr: https
        ? { protocol: "wss", clientPort: parseInt(env.VITE_PORT || "5000") }
        : undefined,
      proxy: {
        "^/rosbridge": {
          target: `ws://127.0.0.1:${env.PORT_ROSBRIDGE || process.env.PORT_ROSBRIDGE || "9090"}`,
          ws: true,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/rosbridge/, ""),
        },
      },
    },
  };
});
