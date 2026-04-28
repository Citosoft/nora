import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";

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

await build({
  entryPoints: ["renderer/main.tsx"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  outfile: "dist/renderer/bundle.js",
  jsx: "automatic",
  sourcemap: false,
  define: {
    __NORA_IS_PRODUCTION__: "true",
    __NORA_POSTHOG_API_KEY__: JSON.stringify(process.env.NORA_POSTHOG_API_KEY ?? ""),
    __NORA_POSTHOG_HOST__: JSON.stringify(process.env.NORA_POSTHOG_HOST ?? ""),
    __VITE_PUBLIC_POSTHOG_PROJECT_TOKEN__: JSON.stringify(process.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN ?? ""),
    __VITE_PUBLIC_POSTHOG_HOST__: JSON.stringify(process.env.VITE_PUBLIC_POSTHOG_HOST ?? ""),
    __NPM_PACKAGE_VERSION__: JSON.stringify(process.env.npm_package_version ?? "")
  },
  tsconfig: "tsconfig.json",
  loader: {
    ".ts": "ts",
    ".tsx": "tsx"
  }
});
