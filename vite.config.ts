import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

/**
 * Serves robot model files from the paths set in .env.
 * No symlinks — the dev server streams files directly from the filesystem.
 *
 *   GET /robot.urdf  → ROBOT_URDF_PATH
 *   GET /meshes/*    → ROBOT_MESHES_PATH/*
 */
function robotAssetsPlugin(urdfPath: string | undefined, meshesPath: string | undefined): Plugin {
  return {
    name: "robot-assets",
    configureServer(server) {
      if (!urdfPath || !meshesPath) {
        console.warn(
          "[robot-assets] ROBOT_URDF_PATH or ROBOT_MESHES_PATH is not set in .env — " +
          "the 3D viewer will not load."
        );
        return;
      }

      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        let filePath: string | undefined;

        if (url === "/robot.urdf") {
          filePath = urdfPath;
        } else if (url.startsWith("/meshes/")) {
          filePath = path.join(meshesPath, url.slice("/meshes/".length));
        }

        if (!filePath) return next();

        fs.stat(filePath, (err, stat) => {
          if (err || !stat.isFile()) return next();
          res.setHeader("Content-Length", stat.size);
          res.setHeader("Content-Type", "application/octet-stream");
          fs.createReadStream(filePath!).pipe(res as NodeJS.WritableStream);
        });
      });
    },
  };
}

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
    plugins: [react(), robotAssetsPlugin(env.ROBOT_URDF_PATH, env.ROBOT_MESHES_PATH)],
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
