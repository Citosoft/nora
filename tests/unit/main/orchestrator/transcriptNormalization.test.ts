import { extractAgentContextLines, isAgentContextLine } from "@main/orchestrator/transcriptNormalization";
import assert from "node:assert/strict";
import test from "node:test";

test("isAgentContextLine filters prompts, status hints, and busy progress lines", () => {
  assert.equal(isAgentContextLine("$ ls"), false);
  assert.equal(isAgentContextLine("> write tests"), false);
  assert.equal(isAgentContextLine("\u203A Working (9s \u2022 esc to interrupt)"), false);
  assert.equal(isAgentContextLine("Tip: Press Esc to interrupt"), false);
  assert.equal(isAgentContextLine("Updated the parser to preserve comments."), true);
});

test("extractAgentContextLines keeps only meaningful agent response lines", () => {
  const content = [
    "$ cd repo",
    "> fix the bug in auth flow",
    "\u2022 Working (12s \u2022 esc to interrupt)",
    "I found the root cause in token parsing.",
    "Patched auth/token.ts and added regression coverage.",
    "Tip: use ? for help"
  ].join("\n");

  assert.deepEqual(extractAgentContextLines(content), [
    "I found the root cause in token parsing.",
    "Patched auth/token.ts and added regression coverage."
  ]);
});

