import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

/**
 * Serves robot model files from the paths set in .env.
 * No symlinks — the dev server streams files directly from the filesystem.
 *
 *   GET /robot.urdf       → ROBOT_URDF_PATH  (must be a plain .urdf file)
 *   GET /meshes/*         → ROBOT_MESHES_PATH/*
 *   GET /robot-env-check  → JSON diagnostics (used by the 3D viewer error banner)
 */
function robotAssetsPlugin(urdfPathRaw: string | undefined, meshesPathRaw: string | undefined): Plugin {
  const urdfPath   = urdfPathRaw   ? path.resolve(process.cwd(), urdfPathRaw)   : undefined;
  const meshesPath = meshesPathRaw ? path.resolve(process.cwd(), meshesPathRaw) : undefined;

  return {
    name: "robot-assets",
    configureServer(server) {
      if (!urdfPath || !meshesPath) {
        console.warn(
          "[robot-assets] ROBOT_URDF_PATH or ROBOT_MESHES_PATH is not set in .env — " +
          "the 3D viewer will not load."
        );
      }

      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";

        // ------------------------------------------------------------------
        // Diagnostic endpoint — lets the browser detect .env misconfigurations.
        // ------------------------------------------------------------------
        if (url === "/robot-env-check") {
          const urdfExists   = Boolean(urdfPath)   && fs.existsSync(urdfPath!);
          const meshesExists = Boolean(meshesPath) && fs.existsSync(meshesPath!);
          const payload = JSON.stringify({
            urdfConfigured:   Boolean(urdfPath),
            meshesConfigured: Boolean(meshesPath),
            urdfExists,
            meshesExists,
          });
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Content-Length", Buffer.byteLength(payload));
          res.end(payload);
          return;
        }

        // ------------------------------------------------------------------
        // Serve /robot.urdf
        // ------------------------------------------------------------------
        if (url === "/robot.urdf") {
          if (!urdfPath) return next();
          fs.stat(urdfPath, (err, stat) => {
            if (err || !stat.isFile()) return next();
            res.setHeader("Content-Length", stat.size);
            res.setHeader("Content-Type", "application/xml");
            fs.createReadStream(urdfPath!).pipe(res as NodeJS.WritableStream);
          });
          return;
        }

        // ------------------------------------------------------------------
        // Serve /meshes/*
        // ------------------------------------------------------------------
        if (url.startsWith("/meshes/")) {
          if (!meshesPath) return next();
          const filePath = path.join(meshesPath, url.slice("/meshes/".length));
          fs.stat(filePath, (err, stat) => {
            if (err || !stat.isFile()) return next();
            res.setHeader("Content-Length", stat.size);
            res.setHeader("Content-Type", "application/octet-stream");
            fs.createReadStream(filePath).pipe(res as NodeJS.WritableStream);
          });
          return;
        }

        next();
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
