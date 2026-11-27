import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

// The app window's preload and the notch island's much narrower one.
const entryPoints = [
  { in: path.join(root, "main", "preload.ts"), out: "preload" },
  { in: path.join(root, "main", "preload", "islandPreload.ts"), out: "islandPreload" }
];
const outdir = path.join(root, "dist", "main");
const preloadChunkDir = path.join(root, "dist", "main", "preload");

const buildOptions = {
  absWorkingDir: root,
  entryPoints,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "es2022",
  outdir,
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
