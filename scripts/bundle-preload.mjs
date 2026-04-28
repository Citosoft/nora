import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const entry = path.join(root, "main", "preload.ts");
const outfile = path.join(root, "dist", "main", "preload.js");
const preloadChunkDir = path.join(root, "dist", "main", "preload");

const buildOptions = {
  absWorkingDir: root,
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "es2022",
  outfile,
  external: ["electron"],
  sourcemap: true,
  logLevel: "info",
  tsconfig: path.join(root, "tsconfig.json")
};

async function removeStalePreloadChunks() {
  await fs.promises.rm(preloadChunkDir, { recursive: true, force: true });
}

async function main() {
  await removeStalePreloadChunks();
  await build(buildOptions);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
