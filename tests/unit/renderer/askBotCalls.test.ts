import assert from "node:assert/strict";
import test from "node:test";
import { askBotCall } from "@/components/app/logic/askBotCalls";
import { groupNativeTimelineEntries } from "@/components/app/logic/nativeTimeline";
import { formatAskBotReply } from "@shared/nora-tools/askBot";
import type { ToolActivity, TimelineItem } from "@shared/types/conversation/contracts.types";

const tool = (id: string, label: string, extra: Partial<ToolActivity> = {}): ToolActivity => ({ kind: "tool", id, runId: "r", createdAt: "", label, output: "", state: "completed",
  details: { category: "integration" }, ...extra });

test("ask_bot calls from Claude and Codex become cards with the asked bot, reply and thread", () => {
  const claude = askBotCall(tool("a", "mcp__nora__ask_bot", { details: { category: "integration", input: JSON.stringify({ bot: "Rex", message: "Is it green?" }) },
    output: formatAskBotReply("Rex", "t1", "Yes.") }));
  assert.deepEqual(claude && [claude.bot, claude.message, claude.threadId, claude.reply, claude.error], ["Rex", "Is it green?", "t1", "Yes.", null]);
  const codex = askBotCall(tool("b", "ask_bot", { state: "failed", details: { category: "integration", detail: "nora", input: "{\n  \"bot\": \"ada\",\n  \"message\": \"x… input truncated" },
    output: "Ada could not answer. See its thread (thread t2)." }));
  assert.deepEqual(codex && [codex.bot, codex.message, codex.threadId, codex.reply, codex.error], ["ada", null, "t2", null, "Ada could not answer. See its thread (thread t2)."]);
  const running = askBotCall(tool("c", "ask_bot", { state: "running", details: { category: "integration", detail: "nora", input: "{\"bot\":\"Rex\",\"message\":\"hi\"}" } }));
  assert.deepEqual(running && [running.reply, running.error, running.threadId], [null, null, null]);
  assert.equal(askBotCall(tool("d", "ask_bot", { details: { category: "integration", detail: "other" } })), null);
  assert.equal(askBotCall(tool("e", "Read")), null);
});

test("ask_bot calls get their own timeline entry; other tools still group per turn", () => {
  const items: TimelineItem[] = [tool("1", "Read"), tool("2", "mcp__nora__ask_bot", { details: { category: "integration", input: "{\"bot\":\"Rex\",\"message\":\"hi\"}" } }), tool("3", "Grep")];
  assert.deepEqual(groupNativeTimelineEntries(items).map((entry) => entry.kind === "tools" ? `tools:${entry.items.map((item) => item.id).join(",")}` : entry.kind),
    ["tools:1,3", "ask"]);
});
