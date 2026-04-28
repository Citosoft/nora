import { execSync } from "node:child_process";

const output = execSync("git ls-files", { encoding: "utf8" });
const files = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

const errors = [];
const lowerCaseMap = new Map();

for (const file of files) {
  if (file.includes("\\")) {
    errors.push(`Backslash path separator detected: ${file}`);
  }

  const normalized = file.replace(/\\/g, "/");
  const lowered = normalized.toLowerCase();
  const existing = lowerCaseMap.get(lowered);
  if (existing && existing !== normalized) {
    errors.push(`Case-colliding paths detected: ${existing} <-> ${normalized}`);
  } else {
    lowerCaseMap.set(lowered, normalized);
  }
}

if (errors.length > 0) {
  console.error("[path-hygiene] failed with issues:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`[path-hygiene] ok (${files.length} tracked paths checked)`);
