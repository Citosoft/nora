#!/usr/bin/env node
/**
 * Manual repro for local commit message generation using this repo's working tree diff.
 * Usage: npm run build && node scripts/testLocalCommitGeneration.mjs
 */
import { execFile, execSync } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

const { buildLocalCommitMessageRequest } = await import("../dist/main/ai/localCommitPrompt.js");
const { extractLocalCommitMessageFromModelOutput } = await import("../dist/main/ai/localCommitMessageParsing.js");

const modelPath = path.join(
  os.homedir(),
  "Library/Application Support/Nora/ai-models/llm/qwen2.5-0.5b-instruct-q4_k_m.gguf"
);
const llamaCliPath = "/opt/homebrew/bin/llama-cli";

const repoRoot = path.join(path.dirname(new URL(import.meta.url).pathname), "..");

const names = execSync("git diff --name-only HEAD", { encoding: "utf8", cwd: repoRoot })
  .trim()
  .split("\n")
  .filter(Boolean);

const changes = names.map((filePath) => {
  const numstat = execSync(`git diff --numstat HEAD -- ${JSON.stringify(filePath)}`, {
    encoding: "utf8",
    cwd: repoRoot
  }).trim().split(/\s+/);
  const diff = execSync(`git diff HEAD -- ${JSON.stringify(filePath)}`, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    cwd: repoRoot
  });
  return {
    path: filePath,
    status: "modified",
    additions: Number(numstat[0] || 0),
    deletions: Number(numstat[1] || 0),
    diff
  };
});

const { system, user } = buildLocalCommitMessageRequest(changes);
console.log(`Loaded ${changes.length} changed files from git diff HEAD\n`);
console.log("--- User prompt ---\n");
console.log(user);
console.log("\n--- End prompt ---\n");

const args = [
  "-m",
  modelPath,
  "-sys",
  system,
  "-p",
  user,
  "-n",
  "64",
  "--temp",
  "0.2",
  "--single-turn",
  "--simple-io",
  "--log-disable"
];

console.log("Running:", llamaCliPath, args.slice(0, 4).join(" "), "...");
const { stdout, stderr } = await execFileAsync(llamaCliPath, args, {
  encoding: "utf8",
  maxBuffer: 4 * 1024 * 1024,
  timeout: 90_000
});

const commitMessage = extractLocalCommitMessageFromModelOutput(stdout);
console.log("\n--- Commit subject ---");
console.log(commitMessage || "(empty)");
console.log("\n--- stderr bytes ---", stderr.length);
console.log(commitMessage ? "OK" : "FAIL");
