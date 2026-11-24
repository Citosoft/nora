import assert from "node:assert/strict";
import test from "node:test";
import { applyMessagePin } from "@main/execution/messagePins";
import { PINNED_MESSAGE_TEXT_LIMIT, PINNED_MESSAGES_LIMIT } from "@shared/conversations/contracts";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import { fixture } from "./fixture";

const instruction = JSON.stringify(["run", "instruction"]);
const pin = (itemId: string, pinned: boolean, commandId = `${pinned ? "pin" : "unpin"}-${itemId}`) =>
  ({ kind: "set-message-pin" as const, commandId, conversationId: "conversation", itemId, pinned });

test("pinning snapshots a message onto the thread, survives settling and restarts, and leaves last activity alone", (t) => {
  const f = fixture(t);
  f.create(); f.submit();
  const { updatedAt } = f.snapshot().conversation;
  f.setTime("2026-10-21T11:00:00.000Z");
  f.command(pin(instruction, true));
  assert.deepEqual(f.snapshot().conversation.pinnedMessages, [{ itemId: instruction, role: "user", text: "run",
    messageAt: "2026-10-21T10:00:00.000Z", pinnedAt: "2026-10-21T11:00:00.000Z" }]);
  assert.equal(f.snapshot().conversation.updatedAt, updatedAt);
  const cursor = f.store.cursor();
  f.command(pin(instruction, true, "pin-again"));
  assert.equal(f.store.cursor(), cursor, "pinning a pinned message records nothing");
  f.restart();
  assert.equal(f.snapshot().conversation.pinnedMessages?.length, 1);
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  f.command({ kind: "archive", commandId: "archive", conversationId: "conversation" });
  f.command(pin(instruction, false));
  assert.deepEqual(f.snapshot().conversation.pinnedMessages, []);
});

test("only an existing, finished message can be pinned", (t) => {
  const f = fixture(t);
  f.create();
  assert.throws(() => f.command(pin("missing", true)), /Only a finished message can be pinned/);
  const cursor = f.store.cursor();
  f.command(pin("missing", false));
  assert.equal(f.store.cursor(), cursor, "unpinning an unpinned message records nothing");
});

const message = (id: string, text: string, complete = true, role: "user" | "assistant" = "assistant", chatText?: string): TimelineItem =>
  ({ kind: "message", id, runId: "run", role, text, complete, createdAt: "2026-10-21T10:00:00.000Z", ...(chatText ? { chatText } : {}) });

test("pins keep the chat's own words, cut long text, refuse streaming replies and stop at the limit", (t) => {
  const f = fixture(t);
  f.create();
  const conversation = f.snapshot().conversation;
  const now = "2026-10-21T11:00:00.000Z";
  const wrapped = message("user", "<wrapper>Ship it</wrapper>", true, "user", "Ship it");
  const own = applyMessagePin(conversation, { itemId: "user", pinned: true }, wrapped, now);
  assert.equal(own.kind === "changed" ? own.pins[0]?.text : null, "Ship it");
  const long = applyMessagePin(conversation, { itemId: "long", pinned: true }, message("long", "x".repeat(PINNED_MESSAGE_TEXT_LIMIT * 2)), now);
  const text = long.kind === "changed" ? long.pins[0]?.text ?? "" : "";
  assert.equal(text.length, PINNED_MESSAGE_TEXT_LIMIT); assert.ok(text.endsWith("…"));
  assert.equal(applyMessagePin(conversation, { itemId: "live", pinned: true }, message("live", "Writ", false), now).kind, "invalid");
  const full = { ...conversation, pinnedMessages: Array.from({ length: PINNED_MESSAGES_LIMIT }, (_, index) =>
    ({ itemId: `pin-${index}`, role: "assistant" as const, text: "", messageAt: now, pinnedAt: now })) };
  assert.equal(applyMessagePin(full, { itemId: "one-more", pinned: true }, message("one-more", "More"), now).kind, "invalid");
  assert.equal(applyMessagePin(full, { itemId: "pin-0", pinned: false }, null, now).kind, "changed");
});
