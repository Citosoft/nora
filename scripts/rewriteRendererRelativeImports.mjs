#!/usr/bin/env node
/**
 * Rewrites static ES import specifiers (./ or ../) to @/, @shared/, or @main/.
 * Used for renderer/ and tests/unit/ sources only — do not process main/ here, because resolving
 * same-package imports to @main/ would require tsc-alias on every main emit (main keeps ./ for local modules).
 * Unit tests rely on `tsc-alias` after `tsc -p tsconfig.unit.json` so emitted dist-tests JS resolves aliases under Node.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const rendererRoot = path.join(repoRoot, "renderer");
const sharedRoot = path.join(repoRoot, "shared");
const mainRoot = path.join(repoRoot, "main");

const importRe = /(\bfrom\s+)(['"])(\.\.?\/[^'"]+)(['"])/g;
const importSideRe = /(\bimport\s+)(['"])(\.\.?\/[^'"]+)(['"])/g;
const importTypeRe = /(\bimport\s+type\s+[^'"]+\s+from\s+)(['"])(\.\.?\/[^'"]+)(['"])/g;
const exportFromRe = /(\bexport\s+[^'"]+\s+from\s+)(['"])(\.\.?\/[^'"]+)(['"])/g;
/** TypeScript `import("./../shared/…").X` style type queries */
const importCallSharedRe = /\bimport\s*\(\s*(['"])((?:\.\.\/)+shared\/[^'"]+)\1\)/g;

function collectFiles(dir, acc = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === "dist") continue;
      collectFiles(full, acc);
    } else if (/\.(tsx?)$/.test(name.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function toAlias(fromFile, spec) {
  const abs = path.normalize(path.join(path.dirname(fromFile), spec));
  const relR = path.relative(rendererRoot, abs);
  if (relR && !relR.startsWith("..") && !path.isAbsolute(relR)) {
    return "@/" + relR.split(path.sep).join("/");
  }
  const relS = path.relative(sharedRoot, abs);
  if (relS && !relS.startsWith("..") && !path.isAbsolute(relS)) {
    return "@shared/" + relS.split(path.sep).join("/");
  }
  const relM = path.relative(mainRoot, abs);
  if (relM && !relM.startsWith("..") && !path.isAbsolute(relM)) {
    return "@main/" + relM.split(path.sep).join("/");
  }
  return null;
}

function rewriteContent(fromFile, content) {
  const replacer = (_m, prefix, q1, spec, q2) => {
    if (!spec.startsWith(".")) return _m;
    const alias = toAlias(fromFile, spec);
    if (!alias) return _m;
    return `${prefix}${q1}${alias}${q2}`;
  };
  const importCallReplacer = (_m, q1, spec) => {
    const alias = toAlias(fromFile, spec);
    if (!alias || !alias.startsWith("@shared/")) return _m;
    return `import(${q1}${alias}${q1})`;
  };
  return content
    .replace(importTypeRe, replacer)
    .replace(importRe, replacer)
    .replace(importSideRe, replacer)
    .replace(exportFromRe, replacer)
    .replace(importCallSharedRe, importCallReplacer);
}

function rewriteTree(root, label) {
  let n = 0;
  if (!fs.existsSync(root)) return n;
  for (const file of collectFiles(root)) {
    const before = fs.readFileSync(file, "utf8");
    const after = rewriteContent(file, before);
    if (after !== before) {
      fs.writeFileSync(file, after, "utf8");
      n++;
    }
  }
  console.error(`Updated ${n} files under ${label}`);
  return n;
}

const testsUnit = path.join(repoRoot, "tests", "unit");
rewriteTree(rendererRoot, "renderer/");
rewriteTree(testsUnit, "tests/unit/");
