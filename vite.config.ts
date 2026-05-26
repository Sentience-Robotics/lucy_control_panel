import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

/**
 * Minimal xacro → URDF expander for the subset of xacro used in this project.
 *
 * Handles:
 *   - ${varName}  property substitution
 *   - <xacro:if value="true|false">   keep / remove block
 *   - <xacro:unless value="true|false"> remove / keep block
 *   - Standalone <xacro:property .../> and <xacro:arg .../> declarations (stripped)
 *   - xmlns:xacro namespace attribute on the root element (stripped)
 *
 * Does NOT handle: xacro:include, macros, math expressions, or ROS package:// paths.
 * Those are not used in robot_description.urdf.xacro.
 */
function processXacroFile(content: string, vars: Record<string, string>): string {
  // 1. Substitute ${varName}
  let out = content.replace(/\$\{([^}]+)\}/g, (m, name) => vars[name.trim()] ?? m);

  // 2. <xacro:if value="false">…</xacro:if>  →  remove entire block
  out = out.replace(/<xacro:if\s+value="false"[^>]*>[\s\S]*?<\/xacro:if>/g, "");
  // 3. <xacro:if value="true">…</xacro:if>   →  keep inner content only
  out = out.replace(/<xacro:if\s+value="true"[^>]*>([\s\S]*?)<\/xacro:if>/g, "$1");

  // 4. <xacro:unless value="true">…</xacro:unless>  →  remove entire block
  out = out.replace(/<xacro:unless\s+value="true"[^>]*>[\s\S]*?<\/xacro:unless>/g, "");
  // 5. <xacro:unless value="false">…</xacro:unless>  →  keep inner content only
  out = out.replace(/<xacro:unless\s+value="false"[^>]*>([\s\S]*?)<\/xacro:unless>/g, "$1");

  // 6. Strip standalone xacro declarations (self-closing tags)
  out = out.replace(/<xacro:property[^>]*\/>/g, "");
  out = out.replace(/<xacro:arg[^>]*\/>/g, "");

  // 7. Strip xmlns:xacro namespace attribute from root element
  out = out.replace(/\s+xmlns:xacro="[^"]*"/g, "");

  return out;
}

/**
 * Serves robot model files from the paths set in .env.
 * No symlinks — the dev server streams files directly from the filesystem.
 *
 *   GET /robot.urdf       → ROBOT_URDF_PATH  (auto-processed if .xacro)
 *   GET /meshes/*         → ROBOT_MESHES_PATH/*
 *   GET /robot-env-check  → JSON diagnostics (used by the 3D viewer error banner)
 *
 * Xacro support
 * -------------
 * When ROBOT_URDF_PATH ends in ".xacro" the plugin runs processXacroFile() before
 * sending the response.  ${mesh_dir} is derived automatically:
 *   - if ROBOT_MESHES_PATH/dae/ exists  →  file://ROBOT_MESHES_PATH/dae
 *   - otherwise                         →  file://ROBOT_MESHES_PATH
 * use_gazebo_sim is always injected as "false" (the control panel never uses Gazebo).
 */
function robotAssetsPlugin(urdfPathRaw: string | undefined, meshesPathRaw: string | undefined): Plugin {
  // Resolve relative paths against process.cwd() (the project root where vite is launched).
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
          const isXacro      = Boolean(urdfPath?.toLowerCase().endsWith(".xacro"));
          const urdfExists   = Boolean(urdfPath)   && fs.existsSync(urdfPath!);
          const meshesExists = Boolean(meshesPath) && fs.existsSync(meshesPath!);
          const payload = JSON.stringify({
            urdfConfigured:   Boolean(urdfPath),
            meshesConfigured: Boolean(meshesPath),
            urdfExists,
            meshesExists,
            isXacro,
          });
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Content-Length", Buffer.byteLength(payload));
          res.end(payload);
          return;
        }

        // ------------------------------------------------------------------
        // Serve /robot.urdf — with optional xacro expansion
        // ------------------------------------------------------------------
        if (url === "/robot.urdf") {
          if (!urdfPath || !fs.existsSync(urdfPath)) return next();

          if (urdfPath.toLowerCase().endsWith(".xacro")) {
            try {
              const raw = fs.readFileSync(urdfPath, "utf-8");

              // Derive the value for ${mesh_dir}: prefer <meshesPath>/dae if present.
              let meshDir = "";
              if (meshesPath) {
                const daePath = path.join(meshesPath, "dae");
                meshDir = "file://" + (fs.existsSync(daePath) ? daePath : meshesPath);
              }

              const processed = processXacroFile(raw, {
                mesh_dir: meshDir,
                use_gazebo_sim: "false",
              });

              const buf = Buffer.from(processed, "utf-8");
              res.setHeader("Content-Type", "application/xml");
              res.setHeader("Content-Length", buf.length);
              res.end(buf);
            } catch (err) {
              console.error("[robot-assets] Failed to process xacro file:", err);
              next();
            }
            return;
          }

          // Plain URDF — stream directly
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
