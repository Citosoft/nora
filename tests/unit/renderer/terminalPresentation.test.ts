import { normalizeBufferedTerminalOutput } from "@/components/app/logic/terminalPresentation";
import assert from "node:assert/strict";
import test from "node:test";

test("normalizeBufferedTerminalOutput preserves bare carriage returns for TUI replay", () => {
  const buffer = "progress 10%\rprogress 20%\u001b[2K\rmenu item";

  assert.equal(normalizeBufferedTerminalOutput(buffer), buffer);
});
