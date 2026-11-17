import assert from "node:assert/strict";
import test from "node:test";
import { startAttentionNotifier } from "@main/attention/notifier";
import { describeAttention } from "@shared/conversations/attention";
import { snapshotBot } from "@shared/bots/snapshot";
import type { ConversationEvent, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationSummary } from "@shared/types/conversation/queries.types";
import type { EventSubscription } from "@main/types/execution/engine.types";
import type { AttentionNotice } from "@shared/types/conversation/attention.types";
import { bot } from "../../shared/bots/fixtures";
import { conversation } from "../nora-tools/fixture";

const approval = (id: string, status: RuntimeRequest["status"] = "pending"): RuntimeRequest => ({ kind: "approval", id, runId: "r", attemptId: "a", nativeId: id,
  status, createdAt: "", expiresAt: "", title: "Run npm test?", options: [{ id: "allow", label: "Allow" }] });

test("notices name the waiting bot and who it is working for", () => {
  const nora = conversation("nora", { title: "Release prep" });
  const rex = conversation("rex", { parentId: "nora", bot: snapshotBot(bot("rex")) });
  const group = conversation("group", { title: "Launch", group: { members: [], writer: null, hopLimit: 4 } as never });
  assert.deepEqual(describeAttention(rex, nora, approval("q")), { conversationId: "rex", who: "Rex", title: "Rex needs your approval", body: "Run npm test? · asked by Nora" });
  assert.equal(describeAttention(rex, group, approval("q")).body, "Run npm test? · in the group \"Launch\"");
  const question: RuntimeRequest = { kind: "question", id: "q2", runId: "r", attemptId: "a", nativeId: "q2", status: "pending", createdAt: "", expiresAt: "", title: "Which branch?",
    questions: [{ id: "b", text: "Which branch?", options: ["main"], multiple: false }] };
  assert.deepEqual(describeAttention(nora, null, question), { conversationId: "nora", who: "Release prep", title: "Release prep has a question for you", body: "Which branch?" });
});

test("each request notifies once, only when allowed, and the badge counts what is still waiting", () => {
  const rex = conversation("rex", { bot: snapshotBot(bot("rex")) });
  let pending = 0, focused = false;
  const notices: AttentionNotice[] = [], badges: number[] = [];
  let listener: EventSubscription | null = null;
  const summaries = (): ConversationSummary[] => [{ conversation: rex, latestRun: null, queuedCount: 0, pendingRequestCount: pending },
    { conversation: conversation("old", { archivedAt: "2026-11-13T00:00:00.000Z" }), latestRun: null, queuedCount: 0, pendingRequestCount: 5 }];
  const stop = startAttentionNotifier({ shouldNotify: () => !focused, notify: (notice) => notices.push(notice), setBadge: (count) => badges.push(count),
    host: { eventCursor: () => 0, summaries, header: (id) => id === "rex" ? ({ conversation: rex } as ConversationHeader) : null,
      subscribe(subscription) { listener = subscription; return () => { listener = null; }; } } });
  const send = (request: RuntimeRequest): void => listener?.onEvent({ schemaVersion: 1, id: request.id + request.status, conversationId: "rex", cursor: 1, at: "",
    payload: { kind: "request", request } } as ConversationEvent);
  pending = 1; send(approval("one")); send(approval("one"));
  focused = true; pending = 2; send(approval("two"));
  pending = 1; send(approval("two", "resolved"));
  assert.deepEqual(notices.map((notice) => notice.title), ["Rex needs your approval"]);
  assert.deepEqual(badges, [0, 1, 1, 2, 1]);
  stop();
  assert.equal(listener, null);
});
