import { writeAnalyticsBuildConfig } from "./analytics-build-config.mjs";
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { writeAccountBuildConfig } from "./account-build-config.mjs";
import { writeRendererBundledPackages } from "./bundledPackages.mjs";

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile();
await writeAccountBuildConfig();
await writeAnalyticsBuildConfig();

const result = await build({
  // The app and the macOS notch island, each its own page. `islandBundle` must not be `island`, which tsc emits for island.tsx.
  entryPoints: [{ in: "renderer/main.tsx", out: "bundle" }, { in: "renderer/island.tsx", out: "islandBundle" }],
  metafile: true,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  outdir: "dist/renderer",
  jsx: "automatic",
  sourcemap: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __NORA_IS_PRODUCTION__: "true",
    __NPM_PACKAGE_VERSION__: JSON.stringify(process.env.npm_package_version ?? "")
  },
  tsconfig: "tsconfig.json",
  loader: {
    ".ts": "ts",
    ".tsx": "tsx"
  }
});

await writeRendererBundledPackages(result.metafile);
