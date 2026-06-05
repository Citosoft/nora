import { extractLocalCommitMessageFromModelOutput } from "@main/ai/localCommitMessageParsing";
import assert from "node:assert/strict";
import test from "node:test";

test("extractLocalCommitMessageFromModelOutput picks the quoted subject from llama-cli output", () => {
  const raw = [
    "> Generate one git commit subject line for these staged changes.",
    "Changed files:",
    "- src/auth.ts (modified)",
    "",
    "\"Fix login session timeout\"",
    "",
    "[ Prompt: 7263.1 t/s | Generation: 232.0 t/s ]",
    "",
    "Exiting..."
  ].join("\n");

  assert.equal(extractLocalCommitMessageFromModelOutput(raw), "Fix login session timeout");
});

test("extractLocalCommitMessageFromModelOutput keeps the last plausible subject line", () => {
  const raw = [
    "Generate a single git commit subject line for these staged changes.",
    "Diff context:",
    "+export const fixLogin = true;",
    "Fix auth redirect loop"
  ].join("\n");
  assert.equal(extractLocalCommitMessageFromModelOutput(raw), "Fix auth redirect loop");
});
