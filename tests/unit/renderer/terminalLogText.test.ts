import { formatInstallLogText, stripTerminalControlSequences } from "@/components/app/logic/terminalLogText";
import assert from "node:assert/strict";
import test from "node:test";

test("stripTerminalControlSequences removes ANSI styling escapes", () => {
  const output = "\u001b[0;2mOpenCode includes free models\u001b[0m";

  assert.equal(stripTerminalControlSequences(output), "OpenCode includes free models");
});

test("stripTerminalControlSequences removes visible escaped ANSI styling markers", () => {
  const output = "\u241b[0;2mOpenCode includes free models\u241b[0m";

  assert.equal(stripTerminalControlSequences(output), "OpenCode includes free models");
});

test("formatInstallLogText joins and cleans install log lines", () => {
  const lines = [
    "\u001b[32mInstalled package\u001b[0m",
    "\u241b[0;2mFor more information visit \u241b[0mhttps://opencode.ai/docs"
  ];

  assert.equal(formatInstallLogText(lines), "Installed package\nFor more information visit https://opencode.ai/docs");
});
