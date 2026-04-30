import {
  extractAgentContextLines,
  isAgentContextLine,
  normalizeTerminalChunkForContext
} from "@main/orchestrator/transcriptNormalization";
import assert from "node:assert/strict";
import test from "node:test";

test("isAgentContextLine filters prompts, status hints, and busy progress lines", () => {
  assert.equal(isAgentContextLine("$ ls"), false);
  assert.equal(isAgentContextLine("> write tests"), false);
  assert.equal(isAgentContextLine("\u203A Working (9s \u2022 esc to interrupt)"), false);
  assert.equal(isAgentContextLine("Tip: Press Esc to interrupt"), false);
  assert.equal(isAgentContextLine("Updated the parser to preserve comments."), true);
});

test("isAgentContextLine drops thinking / progress lines with CLI decoration (Gemini-style)", () => {
  assert.equal(isAgentContextLine("\u00b7 Thinking (2s)"), false);
  assert.equal(isAgentContextLine("\u280b Generating response\u2026"), false);
  assert.equal(isAgentContextLine("**Thinking**"), false);
  assert.equal(isAgentContextLine("Thought for 4s"), false);
  assert.equal(isAgentContextLine("Model is thinking\u2026"), false);
  assert.equal(isAgentContextLine("\u2807\u2807\u2807"), false);
  assert.equal(isAgentContextLine("Here is the summary from the README."), true);
  assert.equal(
    isAgentContextLine("workspace (/directory)                branch               sandbox                   /model                                  quota"),
    false
  );
  assert.equal(
    isAgentContextLine("~/dev/nora-oss                        dev                  no sandbox                gemini-3-flash-preview               13% used"),
    false
  );
});

test("normalizeTerminalChunkForContext strips bare CR so TTY echo does not fake line breaks", () => {
  assert.equal(normalizeTerminalChunkForContext("a\rb\r"), "ab");
  assert.equal(normalizeTerminalChunkForContext("a\r\nb"), "a\nb");
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

