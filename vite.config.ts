import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const certPath = path.resolve("./certs/cert.pem");
const keyPath = path.resolve("./certs/key.pem");
const cert = fs.readFileSync(certPath);
const key = fs.readFileSync(keyPath);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT || "5000"),
      host: true,
      https: { key, cert },
    },
  };
});
