import assert from "node:assert/strict";
import test from "node:test";
import { askBotReplyText, askBotThreadId, askBotThreadMark, formatAskBotFinishedNotice, formatAskBotReply, formatAskBotWorking, isAskBotCall, isAskBotWorking } from "@shared/nora-tools/askBot";

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

test("working and finished notices cover notify and timeout outcomes", () => {
  const notify = formatAskBotWorking("Ada", "t1", "notify");
  const timeout = formatAskBotWorking("Ada", "t1", "timeout");
  assert.equal(isAskBotWorking(notify), true);
  assert.equal(isAskBotWorking(timeout), true);
  assert.match(notify, /Nora will post Ada's answer/);
  assert.match(timeout, /still working/);
  assert.match(formatAskBotFinishedNotice("Ada", "t1", { status: "completed", text: "Done.", failure: null }), /finished what you asked \(thread t1\)/);
  assert.match(formatAskBotFinishedNotice("Ada", "t1", { status: "failed", text: null, failure: "rate limited" }), /could not finish.*rate limited/);
});
