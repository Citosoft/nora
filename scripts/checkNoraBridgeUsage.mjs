#!/usr/bin/env node
/**
 * Enforces renderer bridge policy: raw `window.nora` access is only allowed in
 * the typed bridge declaration and client adapter modules.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const rendererRoot = join(root, "renderer");
const allowedFiles = new Set([
  join(rendererRoot, "global.d.ts")
]);
const allowedPrefixes = [
  join(rendererRoot, "components", "app", "clients")
];
const rawBridgePattern = /\bwindow\.nora\b/;

const walk = (dir, files = []) => {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "components" || name.name === "lib" || name.name === "hooks" || name.name === "dialogs" || name.name === "chrome" || name.name === "shared" || name.name === "sidebar" || name.name === "context" || name.name === "panels" || name.name === "views" || name.name === "logic" || name.name === "types" || name.name === "features" || name.name === "styles" || dir === rendererRoot) {
        walk(p, files);
      } else {
        walk(p, files);
      }
    } else if (/\.(ts|tsx|d\.ts)$/.test(name.name)) {
      files.push(p);
    }
  }
  return files;
};

const isAllowed = (file) =>
  allowedFiles.has(file) || allowedPrefixes.some((prefix) => file.startsWith(`${prefix}/`) || file === prefix);

const offenders = [];

for (const file of walk(rendererRoot)) {
  const src = readFileSync(file, "utf8");
  if (!rawBridgePattern.test(src) || isAllowed(file)) {
    continue;
  }
  offenders.push(relative(root, file).replaceAll("\\", "/"));
}

if (offenders.length > 0) {
  console.error("Raw window.nora usage is only allowed in renderer/global.d.ts and renderer/components/app/clients/. Offenders:");
  for (const offender of offenders) {
    console.error(`  - ${offender}`);
  }
  process.exit(1);
}

console.log(`checkNoraBridgeUsage: ok (${walk(rendererRoot).length} renderer source files checked)`);
