// Stamps dist/sw.js with a content-derived build ID and the list of app-shell files to precache.
// Runs after `expo export --platform web`; the shell is the HTML entry, manifest, icons and hashed JS/CSS bundles.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve(import.meta.dirname, "..", "dist");
const shellPattern = /^(index\.html|manifest\.webmanifest|favicon\.ico|icons\/.+\.png|_expo\/static\/(js|css)\/.+\.(js|css))$/;

async function listFiles(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listFiles(path.join(dir, entry.name), relative) : [relative];
  }));
  return nested.flat();
}

const shellFiles = (await listFiles(distDir)).filter((file) => shellPattern.test(file)).sort();
if (!shellFiles.includes("index.html")) throw new Error("dist/index.html is missing; run `expo export --platform web` first.");
const hash = createHash("sha256");
for (const file of shellFiles) hash.update(file).update(await readFile(path.join(distDir, file)));
const build = { id: hash.digest("hex").slice(0, 16), shell: ["/", ...shellFiles.map((file) => `/${file}`)] };

const swPath = path.join(distDir, "sw.js");
const source = await readFile(swPath, "utf8");
const pattern = /\/\* NORA_BUILD_START \*\/[\s\S]*?\/\* NORA_BUILD_END \*\//;
if (!pattern.test(source)) throw new Error("dist/sw.js has no NORA_BUILD block to stamp.");
await writeFile(swPath, source.replace(pattern, `/* NORA_BUILD_START */ ${JSON.stringify(build)} /* NORA_BUILD_END */`));
console.log(`Stamped dist/sw.js build ${build.id} with ${build.shell.length} shell entries.`);
