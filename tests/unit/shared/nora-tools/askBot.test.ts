import assert from "node:assert/strict";
import test from "node:test";
import { askBotReplyText, askBotThreadId, askBotThreadMark, formatAskBotReply, isAskBotCall } from "@shared/nora-tools/askBot";

test("ask_bot calls are recognised from either runtime's naming", () => {
  assert.equal(isAskBotCall("mcp__nora__ask_bot", undefined), true);
  assert.equal(isAskBotCall("ask_bot", "nora"), true);
  assert.equal(isAskBotCall("ask_bot", "other"), false);
  assert.equal(isAskBotCall("mcp__nora__list_bots", undefined), false);
});

test("replies and errors carry the asked bot's thread, and only replies yield text", () => {
  const reply = formatAskBotReply("Rex", "c-123", "Build is green.\n\nShip it.");
  assert.equal(askBotThreadId(reply), "c-123");
  assert.equal(askBotReplyText(reply), "Build is green.\n\nShip it.");
  const error = `Rex could not answer: rate limited See its thread ${askBotThreadMark("c-9")}.`;
  assert.equal(askBotThreadId(error), "c-9");
  assert.equal(askBotReplyText(error), null);
  assert.equal(askBotThreadId(""), null);
});
