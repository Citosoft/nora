import {
  capTerminalOutput,
  shouldPublishThrottledTerminalStateUpdate,
  shouldRescanTerminalLastLine,
  shouldRescanTerminalMetadata
} from "@main/orchestrator/terminalPerformance";
import assert from "node:assert/strict";
import test from "node:test";

test("capTerminalOutput trims oversized buffers and preserves tail", () => {
  const head = "a".repeat(210_000);
  const tail = "TAIL";
  const capped = capTerminalOutput(head + tail);

  assert.equal(capped.length, 200_000);
  assert.equal(capped.endsWith(tail), true);
});

test("terminal scan cues only trigger metadata scans on likely signal chunks", () => {
  assert.equal(shouldRescanTerminalMetadata("hello"), false);
  assert.equal(shouldRescanTerminalMetadata("http://localhost:3000"), true);
  assert.equal(shouldRescanTerminalMetadata("done\r\n"), true);
});

test("terminal last-line scan runs only on newline chunks", () => {
  assert.equal(shouldRescanTerminalLastLine("partial"), false);
  assert.equal(shouldRescanTerminalLastLine("line\n"), true);
});

test("state update throttling publishes on critical change or elapsed interval", () => {
  assert.equal(
    shouldPublishThrottledTerminalStateUpdate({
      now: 1000,
      lastUpdatedAt: 900,
      intervalMs: 250,
      hasCriticalChange: false
    }),
    false
  );
  assert.equal(
    shouldPublishThrottledTerminalStateUpdate({
      now: 1000,
      lastUpdatedAt: 900,
      intervalMs: 250,
      hasCriticalChange: true
    }),
    true
  );
  assert.equal(
    shouldPublishThrottledTerminalStateUpdate({
      now: 1200,
      lastUpdatedAt: 900,
      intervalMs: 250,
      hasCriticalChange: false
    }),
    true
  );
});

