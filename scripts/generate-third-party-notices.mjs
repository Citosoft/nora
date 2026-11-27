import { readFile, writeFile } from "node:fs/promises";
import { readRendererBundledPackages } from "./bundledPackages.mjs";

/** Logos copied into the app rather than installed as packages (BrandMarks.tsx and renderer/brand-icons). */
const BUNDLED_ARTWORK = [
  { name: "T3 Code logo", usedIn: "Migrate from another app", copyright: "Copyright (c) 2026 T3 Tools Inc.", license: "MIT" },
  { name: "Orca logo", usedIn: "Migrate from another app", copyright: "Copyright (c) 2026 Lovecast Inc.", license: "MIT" },
  { name: "OpenBot app icon", usedIn: "Migrate bots (identifies the source app)", copyright: "nightly-labs/openbot", license: "PolyForm Noncommercial 1.0.0" },
  { name: "Grok Bot app icon", usedIn: "Migrate bots (identifies the source app)", copyright: "SpaceXAI", license: "Proprietary; shown only to name the app being imported from" }
];

const manifest = JSON.parse(await readFile("package.json", "utf8"));
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const packages = lock.packages ?? {};

const runtimeDependencyKeys = [
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.optionalDependencies ?? {})
].map((packageName) => `node_modules/${packageName}`);

/** Lock keys are paths such as `node_modules/a/node_modules/@b/c`; the package name is the part after the last `node_modules/`. */
function packageNameFromLockKey(lockKey) {
  return lockKey.slice(lockKey.lastIndexOf("node_modules/") + "node_modules/".length);
}

function resolveDependencyMetadata(lockKey) {
  const name = packageNameFromLockKey(lockKey);
  const metadata = packages[lockKey] ?? lock.dependencies?.[name];
  return {
    name,
    version: typeof metadata?.version === "string" ? metadata.version : "unknown",
    license: typeof metadata?.license === "string" ? metadata.license : "UNKNOWN"
  };
}

const entriesById = new Map();
for (const lockKey of [...runtimeDependencyKeys, ...(await readRendererBundledPackages())]) {
  const entry = resolveDependencyMetadata(lockKey);
  entriesById.set(`${entry.name}@${entry.version}`, entry);
}
const sortedEntries = [...entriesById.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
const generatedAt = new Date().toISOString();

const lines = [
  "# Third-Party Notices",
  "",
  "This product includes third-party open-source software.",
  "",
  `Generated: ${generatedAt}`,
  "",
  "| Package | Version | License |",
  "| --- | --- | --- |",
  ...sortedEntries.map((entry) => `| ${entry.name} | ${entry.version} | ${entry.license} |`),
  "",
  "Includes top-level runtime dependencies declared in `package.json` (`dependencies` and `optionalDependencies`) and every package bundled into the renderer.",
  "",
  "License texts are available in each dependency package under `node_modules/<package>/LICENSE*`.",
  "",
  "## Bundled artwork",
  "",
  "| Artwork | Used in | Copyright | License |",
  "| --- | --- | --- | --- |",
  ...BUNDLED_ARTWORK.map((entry) => `| ${entry.name} | ${entry.usedIn} | ${entry.copyright} | ${entry.license} |`),
  ""
];

await writeFile("THIRD_PARTY_NOTICES.md", lines.join("\n"), "utf8");
