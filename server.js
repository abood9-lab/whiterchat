// server.js - Production launcher for Render and Node.js hosting (ESM compatible)
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bundlePath = path.join(__dirname, "dist", "server.cjs");

if (fs.existsSync(bundlePath)) {
  require(bundlePath);
} else {
  console.error("❌ 'dist/server.cjs' was not found.");
  console.error("Please ensure the build command was executed: npm run build:backend");
  process.exit(1);
}
