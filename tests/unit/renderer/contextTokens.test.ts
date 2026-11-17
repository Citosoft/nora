import assert from "node:assert/strict";
import test from "node:test";
import { estimateTokens, formatTokens, tallyContextRequest } from "@/components/app/logic/contextTokens";
import type { DirectContextModelRequest } from "@shared/ipc/types/directContextGateway.types";

const request = (lastRequest: DirectContextModelRequest["lastRequest"]): DirectContextModelRequest => ({ id: "work-thread", title: "Work", purpose: "p", model: "m", lastRequest,
  sections: [{ id: "base", label: "Base", placement: "system", text: null, note: "hidden" }, { id: "bot", label: "Bot", placement: "system", text: "x".repeat(400) },
    { id: "history", label: "History", placement: "history", text: null, note: "hidden" }, { id: "message", label: "Message", placement: "turn", text: "y".repeat(41) }] });

test("visible text is estimated per section, hidden sections count nothing, and a new thread's total is what Nora can see", () => {
  assert.equal(estimateTokens("abcde"), 2);
  const tally = tallyContextRequest(request(null));
  assert.deepEqual(tally.sections.map((entry) => entry.tokens), [null, 100, null, 11]);
  assert.deepEqual([tally.system, tally.turn, tally.next, tally.measured, tally.window], [100, 11, 111, false, null]);
});

test("a measured thread's next request is its last occupancy plus only this turn's new text", () => {
  const tally = tallyContextRequest(request({ usedTokens: 5000, windowTokens: 200_000, inputTokens: 4800, cachedInputTokens: 4000, outputTokens: 200, updatedAt: "2026-11-13T00:00:00.000Z" }));
  assert.deepEqual([tally.next, tally.measured, tally.window], [5011, true, 200_000]);
  assert.deepEqual([formatTokens(950), formatTokens(5011), formatTokens(52_400)], ["950", "5.0k", "52k"]);
});
