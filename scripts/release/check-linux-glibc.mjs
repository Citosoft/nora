import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Fails when any ELF binary in a packaged Linux app needs a newer glibc than we support.
 * Native modules compiled on the runner inherit its glibc, which moves with each `ubuntu-latest` image.
 *
 * Usage: node scripts/release/check-linux-glibc.mjs <packaged app dir> [max glibc minor, default 31]
 */
const [root, maxMinorArgument = "31"] = process.argv.slice(2);
if (!root) {
  console.error("Usage: node scripts/release/check-linux-glibc.mjs <packaged app dir> [max glibc minor]");
  process.exit(1);
}
const maxMinor = Number(maxMinorArgument);
const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);

async function* files(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* files(entryPath);
    else if (entry.isFile()) yield entryPath;
  }
}

/** Highest `GLIBC_2.N` symbol version an ELF file references, or null for non-ELF files and non-glibc (e.g. musl) binaries. */
function highestGlibcMinor(contents) {
  if (!contents.subarray(0, 4).equals(ELF_MAGIC)) return null;
  let highest = null;
  for (const match of contents.toString("latin1").matchAll(/GLIBC_2\.(\d+)/g)) {
    const minor = Number(match[1]);
    if (highest === null || minor > highest) highest = minor;
  }
  return highest;
}

const offenders = [];
let checked = 0;
for await (const file of files(root)) {
  const minor = highestGlibcMinor(await readFile(file));
  if (minor === null) continue;
  checked += 1;
  if (minor > maxMinor) offenders.push(`${path.relative(root, file)} needs GLIBC_2.${minor}`);
}

if (offenders.length) {
  console.error(`Linux binaries need a newer glibc than 2.${maxMinor}:\n  ${offenders.join("\n  ")}`);
  process.exit(1);
}
console.log(`Checked ${checked} ELF binaries in ${root}: all need glibc 2.${maxMinor} or older.`);
