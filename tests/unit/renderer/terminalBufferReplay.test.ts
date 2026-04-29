import { shouldApplyTerminalBufferReplay } from "@/components/app/logic/terminalBufferReplay";
import assert from "node:assert/strict";
import test from "node:test";

test("applies the buffered replay when no live terminal data arrived after the request started", () => {
  assert.equal(shouldApplyTerminalBufferReplay(3, 3), true);
});

test("skips the buffered replay when live terminal data arrived after the request started", () => {
  assert.equal(shouldApplyTerminalBufferReplay(3, 4), false);
});
