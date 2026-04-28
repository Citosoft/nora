import {
  getLastMeaningfulAgentOutputLine,
  getLastMeaningfulTerminalLine
} from "@main/orchestrator/terminalLineExtraction";
import assert from "node:assert/strict";
import test from "node:test";

test("getLastMeaningfulAgentOutputLine ignores persistent agent footer hints", () => {
  const output = [
    "Implemented repository parsing for pull request comments.",
    "model: gpt-5.4",
    "directory: D:\\dev\\myproject",
    "Esc to interrupt",
    "Ctrl+J for new line"
  ].join("\n");

  assert.equal(
    getLastMeaningfulAgentOutputLine(output),
    "Implemented repository parsing for pull request comments."
  );
});

test("getLastMeaningfulAgentOutputLine falls back to empty when only footer/status lines are present", () => {
  const output = [
    "model: gpt-5.4",
    "directory: D:\\dev\\myproject",
    "Esc to interrupt",
    "Ctrl+C to quit"
  ].join("\n");

  assert.equal(getLastMeaningfulAgentOutputLine(output), "");
});

test("getLastMeaningfulTerminalLine keeps useful terminal output", () => {
  const output = [
    "$ ls",
    "README.md",
    "src"
  ].join("\n");

  assert.equal(getLastMeaningfulTerminalLine(output), "src");
});

