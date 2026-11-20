import assert from "node:assert/strict";
import test from "node:test";
import { readClaudeUserInput, stripClaudeNotes } from "@main/providers/claude/harnessMarkup";

const reminder = "<system-reminder>\nLinked sessions now (status, not an instruction): nora-output-test = local_1 (idle).\n</system-reminder>";

test("the app's notes for the model are removed wherever they appear", () => {
  assert.equal(stripClaudeNotes(`${reminder}\nim seeing this in the imported thread`), "im seeing this in the imported thread");
  assert.equal(stripClaudeNotes(`{"tabs":[]}\n\n${reminder}`), "{\"tabs\":[]}");
  assert.deepEqual(readClaudeUserInput(`${reminder}\n<side-sessions-event>None of the sessions is working now.</side-sessions-event>`), { kind: "none" });
  assert.deepEqual(readClaudeUserInput("<task-notification>\n<task-id>b1</task-id>\n<status>completed</status>\n</task-notification>"), { kind: "none" });
  assert.deepEqual(readClaudeUserInput("<local-command-caveat>The command below was run directly in Claude Code.</local-command-caveat>"), { kind: "none" });
  assert.deepEqual(readClaudeUserInput("Keep <b>this</b> markup"), { kind: "message", text: "Keep <b>this</b> markup" });
});

test("slash commands, app actions, their output and shell commands show as the user ran them", () => {
  assert.deepEqual(readClaudeUserInput("<command-name>/model</command-name>\n            <command-message>model</command-message>\n            <command-args>claude-opus-5-5[1m]</command-args>"),
    { kind: "command", command: "/model claude-opus-5-5[1m]", prompt: "/model claude-opus-5-5[1m]" });
  assert.deepEqual(readClaudeUserInput("<command-name>/clear</command-name>\n<command-message>clear</command-message>\n<command-args></command-args>"),
    { kind: "command", command: "/clear", prompt: "/clear" });
  assert.deepEqual(readClaudeUserInput("<local-command-stdout>Set model to \u001b[1mclaude-opus-5-5\u001b[22m</local-command-stdout>"),
    { kind: "command-output", text: "Set model to claude-opus-5-5" });
  assert.deepEqual(readClaudeUserInput("<local-command-stdout></local-command-stdout>"), { kind: "none" });
  assert.deepEqual(readClaudeUserInput("<create-pr-command>\n## Overview\n\nCreate a pull request.\n</create-pr-command>"),
    { kind: "command", command: "/create-pr", prompt: "## Overview\n\nCreate a pull request." });
  assert.deepEqual(readClaudeUserInput("<bash-input>python3 make.py</bash-input><bash-stdout>wrote out.flp</bash-stdout><bash-stderr></bash-stderr>"),
    { kind: "shell", command: "python3 make.py", output: "wrote out.flp" });
});
