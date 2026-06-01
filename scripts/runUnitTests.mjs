import { readdirSync } from "node:fs";
import { cp } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function collectTestFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(path));
      continue;
    }
    if (entry.isFile() && path.endsWith(".test.js")) {
      files.push(path);
    }
  }
  return files;
}

const testRoot = join(process.cwd(), "dist-tests", "tests", "unit");
await cp("package.json", join(process.cwd(), "dist-tests", "package.json"));
const testFiles = collectTestFiles(testRoot).sort();

if (testFiles.length === 0) {
  console.error(`No unit test files found under ${testRoot}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit"
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
