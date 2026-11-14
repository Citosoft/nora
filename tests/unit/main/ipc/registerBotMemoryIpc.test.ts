import assert from "node:assert/strict";
import test from "node:test";
import { registerBotMemoryIpc } from "@main/ipc/registerBotMemoryIpc";
import { openBotMemoryStore } from "@main/bots/memory/store";
import { memoryReviewActivityChannel } from "@shared/bots/memoryReviewActivity";
import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { BotMemoryIpcDeps } from "@main/types/bots/memoryIpc.types";

const event: ConversationInvocation = { sender: { id: 1, isDestroyed: () => false, send: () => {}, once: () => {}, removeListener: () => {} } };

test("review activity covers the last seven days, refuses other windows and unregisters with the notes channel", async (t) => {
  const memory = openBotMemoryStore(":memory:", { now: () => "2026-11-13T00:00:00.000Z", nextId: () => "n1" });
  t.after(() => memory.close());
  const handlers = new Map<string, Parameters<BotMemoryIpcDeps["ipc"]["handle"]>[1]>();
  const sinces: string[] = [];
  let allowed = true;
  const unregister = registerBotMemoryIpc({ memory, now: () => new Date("2026-11-13T12:00:00.000Z"), isAllowedSender: () => allowed,
    ipc: { handle: (channel, handler) => { handlers.set(channel, handler); }, removeHandler: (channel) => { handlers.delete(channel); } },
    reviews: { activity: (since, limit) => { sinces.push(since); assert.equal(limit, 20);
      return { since, totals: { reviews: 0, failed: 0, inputTokens: 0, outputTokens: 0, unmetered: 0 }, recent: [] }; } } });
  const handler = handlers.get(memoryReviewActivityChannel);
  assert.ok(handler);
  assert.deepEqual(await handler(event, {}), { ok: true, activity: { since: "2026-11-06T12:00:00.000Z", totals: { reviews: 0, failed: 0, inputTokens: 0, outputTokens: 0, unmetered: 0 }, recent: [] } });
  allowed = false;
  assert.deepEqual(await handler(event, {}), { ok: false, message: "This window cannot read memory review activity" });
  assert.equal(sinces.length, 1);
  unregister();
  assert.equal(handlers.size, 0);
});
