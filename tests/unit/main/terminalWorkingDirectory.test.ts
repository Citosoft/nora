import {
  extractOsc7WorkingDirectory,
  getTrailingIncompleteOsc7Sequence,
  getSubmittedCommandsFromInput,
  resolveTerminalWorkspaceFromInput
} from "@main/orchestrator/terminalWorkingDirectory";
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

test("resolveTerminalWorkspaceFromInput resolves simple relative cd commands", () => {
  assert.equal(
    resolveTerminalWorkspaceFromInput("cd packages/app\r", "/repo", null),
    "/repo/packages/app"
  );
});

test("resolveTerminalWorkspaceFromInput resolves parent directory changes", () => {
  assert.equal(
    resolveTerminalWorkspaceFromInput("cd ..\n", "/repo/packages/app", null),
    "/repo/packages"
  );
});

test("resolveTerminalWorkspaceFromInput handles quoted directory names", () => {
  assert.equal(
    resolveTerminalWorkspaceFromInput("cd \"packages/web app\"\r", "/repo", null),
    "/repo/packages/web app"
  );
});

test("resolveTerminalWorkspaceFromInput resolves cd with no argument to the user home directory", () => {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  assert.equal(resolveTerminalWorkspaceFromInput("cd\r", "/repo", null), home || null);
});

test("resolveTerminalWorkspaceFromInput resolves cd dash to the previous terminal workspace", () => {
  assert.equal(
    resolveTerminalWorkspaceFromInput("cd -\r", "/repo/current", "/repo/previous"),
    "/repo/previous"
  );
});

test("resolveTerminalWorkspaceFromInput handles Windows-style workspace paths", () => {
  assert.equal(
    resolveTerminalWorkspaceFromInput("cd ..\r", "C:\\Users\\daniel\\repo", null),
    path.win32.normalize("C:\\Users\\daniel")
  );
});

test("resolveTerminalWorkspaceFromInput ignores complex shell input", () => {
  assert.equal(resolveTerminalWorkspaceFromInput("cd packages && npm test\r", "/repo", null), null);
});

test("resolveTerminalWorkspaceFromInput ignores input that has not been submitted", () => {
  assert.equal(resolveTerminalWorkspaceFromInput("cd packages", "/repo", null), null);
});

test("getSubmittedCommandsFromInput buffers character-by-character terminal input", () => {
  const first = getSubmittedCommandsFromInput("c");
  const second = getSubmittedCommandsFromInput(`${first.remainingInput}d packages/app\r`);

  assert.deepEqual(first, {
    commands: [],
    remainingInput: "c"
  });
  assert.deepEqual(second, {
    commands: ["cd packages/app"],
    remainingInput: ""
  });
});

test("getSubmittedCommandsFromInput handles edited terminal input", () => {
  assert.deepEqual(getSubmittedCommandsFromInput("cd wrong\u0015cd packages\r"), {
    commands: ["cd packages"],
    remainingInput: ""
  });
  assert.deepEqual(getSubmittedCommandsFromInput("cd packagess\u007f\r"), {
    commands: ["cd packages"],
    remainingInput: ""
  });
});

test("extractOsc7WorkingDirectory reads OSC 7 cwd escape sequences", () => {
  assert.equal(
    extractOsc7WorkingDirectory("\u001b]7;file://host/Users/daniel/dev/nora-oss\u0007"),
    "/Users/daniel/dev/nora-oss"
  );
  assert.equal(
    extractOsc7WorkingDirectory("\u001b]7;file://host/Users/daniel/dev/web%20app\u001b\\"),
    "/Users/daniel/dev/web app"
  );
});

test("extractOsc7WorkingDirectory returns the last OSC 7 cwd in a chunk", () => {
  assert.equal(
    extractOsc7WorkingDirectory(
      "\u001b]7;file://host/Users/daniel/dev/old\u0007text\u001b]7;file://host/Users/daniel/dev/current\u0007"
    ),
    "/Users/daniel/dev/current"
  );
});

test("getTrailingIncompleteOsc7Sequence keeps only an unterminated OSC 7 tail", () => {
  assert.equal(
    getTrailingIncompleteOsc7Sequence("\u001b]7;file://host/Users/daniel/dev/current"),
    "\u001b]7;file://host/Users/daniel/dev/current"
  );
  assert.equal(
    getTrailingIncompleteOsc7Sequence("\u001b]7;file://host/Users/daniel/dev/current\u0007"),
    ""
  );
});
