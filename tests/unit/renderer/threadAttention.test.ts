import assert from "node:assert/strict";
import test from "node:test";
import { waitingDescendants } from "@/components/app/logic/thread-workspace/attention";
import { snapshotBot } from "@shared/bots/snapshot";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import { bot } from "../shared/bots/fixtures";
import { conversation } from "../main/nora-tools/fixture";

const summary = (entry: Conversation, pendingRequestCount = 0): ConversationSummary => ({ conversation: entry, latestRun: null, queuedCount: 0, pendingRequestCount });

test("a waiting bot two levels down shows on every visible ancestor, and settled children are ignored", () => {
  const waiting = waitingDescendants([
    summary(conversation("nora")),
    summary(conversation("ada", { parentId: "nora", bot: snapshotBot(bot("ada")) })),
    summary(conversation("rex", { parentId: "ada", bot: snapshotBot(bot("rex")) }), 1),
    summary(conversation("moss", { parentId: "other", bot: snapshotBot(bot("moss")), archivedAt: "2026-11-13T00:00:00.000Z" }), 2)
  ]);
  assert.deepEqual(waiting.get("nora"), { conversationId: "rex", name: "Rex" });
  assert.deepEqual(waiting.get("ada"), { conversationId: "rex", name: "Rex" });
  assert.equal(waiting.has("rex"), false);
  assert.equal(waiting.has("other"), false);
});
