import { readFile, writeFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("package.json", "utf8"));
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const packages = lock.packages ?? {};

const runtimeDependencyNames = Array.from(
  new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {})
  ])
).sort((a, b) => a.localeCompare(b));

function resolveDependencyMetadata(packageName) {
  const packageKey = `node_modules/${packageName}`;
  const packageMetadata = packages[packageKey];

  if (packageMetadata && typeof packageMetadata === "object") {
    return {
      name: packageName,
      version: typeof packageMetadata.version === "string" ? packageMetadata.version : "unknown",
      license: typeof packageMetadata.license === "string" ? packageMetadata.license : "UNKNOWN"
    };
  }

  const legacyMetadata = lock.dependencies?.[packageName];
  return {
    name: packageName,
    version: typeof legacyMetadata?.version === "string" ? legacyMetadata.version : "unknown",
    license: typeof legacyMetadata?.license === "string" ? legacyMetadata.license : "UNKNOWN"
  };
}

const sortedEntries = runtimeDependencyNames.map((packageName) => resolveDependencyMetadata(packageName));
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
  "Includes top-level runtime dependencies declared in `package.json` (`dependencies` and `optionalDependencies`).",
  "",
  "License texts are available in each dependency package under `node_modules/<package>/LICENSE*`.",
  ""
];

await writeFile("THIRD_PARTY_NOTICES.md", lines.join("\n"), "utf8");
