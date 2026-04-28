#!/usr/bin/env node
/**
 * Ensures `assembleSignedInShellAssembly` is only imported from
 * `renderer/components/app/logic/` and `renderer/components/app/views/`.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const rendererApp = join(root, "renderer", "components", "app");
/** Import of the function module, not `assembleSignedInShellAssembly.types`. */
const badImportPattern = /from\s+["'][^"']*assembleSignedInShellAssembly(?!\.types)/;
const allowedPrefixes = [
  join(rendererApp, "logic"),
  join(rendererApp, "views")
];

const walk = (dir, files = []) => {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      walk(p, files);
    } else if (/\.(ts|tsx)$/.test(name.name)) {
      files.push(p);
    }
  }
  return files;
};

const files = walk(rendererApp);
let bad = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  if (!badImportPattern.test(src)) {
    continue;
  }
  const rel = relative(root, file).replaceAll("\\", "/");
  const ok = allowedPrefixes.some((prefix) => file.startsWith(prefix + "/") || file === prefix);
  if (!ok) {
    bad.push(rel);
  }
}

if (bad.length) {
  console.error("assembleSignedInShellAssembly must only be imported under renderer/components/app/logic/ and views/. Offenders:");
  for (const f of bad) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
}

console.log("checkShellAssemblyImports: ok");
