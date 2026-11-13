import assert from "node:assert/strict";
import test from "node:test";
import { attentionSources, buildAttentionToasts, inlineQuestion } from "@/components/app/logic/attentionToasts";
import { compactApprovalActions } from "@/components/app/logic/approvalActions";
import { snapshotBot } from "@shared/bots/snapshot";
import type { Conversation, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationSummary } from "@shared/types/conversation/queries.types";
import { bot } from "../shared/bots/fixtures";
import { conversation } from "../main/nora-tools/fixture";

const approval = (id: string, createdAt: string, status: RuntimeRequest["status"] = "pending"): RuntimeRequest => ({ kind: "approval", id, runId: "r", attemptId: "a",
  nativeId: id, status, createdAt, expiresAt: "", title: "Run npm test?", options: [{ id: "allow", label: "Allow" }] });
const summary = (entry: Conversation, pendingRequestCount: number): ConversationSummary => ({ conversation: entry, latestRun: null, queuedCount: 0, pendingRequestCount });
const header = (entry: Conversation, pendingRequests: RuntimeRequest[]): ConversationHeader => ({ conversation: entry, activeRuns: [], queuedRuns: [], pendingRequests } as unknown as ConversationHeader);

test("toasts cover waiting requests outside the viewed thread, oldest first, and skip dismissed or answered ones", () => {
  const nora = conversation("nora");
  const rex = conversation("rex", { parentId: "nora", bot: snapshotBot(bot("rex")) });
  const viewed = conversation("viewed");
  const settled = conversation("settled", { archivedAt: "2026-11-13T00:00:00.000Z" });
  const summaries = [summary(nora, 1), summary(rex, 2), summary(viewed, 1), summary(settled, 1)];
  const sources = attentionSources(summaries, "viewed");
  assert.deepEqual(sources.map((source) => source.conversationId), ["nora", "rex"]);
  const headers = new Map([["nora", header(nora, [approval("n1", "2026-11-13T00:00:03Z")])],
    ["rex", header(rex, [approval("r1", "2026-11-13T00:00:01Z"), approval("r2", "2026-11-13T00:00:02Z", "responding")])]]);
  const toasts = buildAttentionToasts(sources, headers, summaries, new Set());
  assert.deepEqual(toasts.map((toast) => [toast.request.id, toast.notice.title, toast.notice.body]),
    [["r1", "Rex needs your approval", "Run npm test? · asked by Nora"], ["n1", "nora needs your approval", "Run npm test?"]]);
  assert.deepEqual(buildAttentionToasts(sources, headers, summaries, new Set(["r1"])).map((toast) => toast.request.id), ["n1"]);
});

test("only a single single-choice question with a few options can be answered from a toast", () => {
  const question = (questions: Extract<RuntimeRequest, { kind: "question" }>["questions"]): RuntimeRequest =>
    ({ kind: "question", id: "q", runId: "r", attemptId: "a", nativeId: "q", status: "pending", createdAt: "", expiresAt: "", title: "Pick", questions });
  assert.deepEqual(inlineQuestion(question([{ id: "b", text: "Which branch?", options: ["main", "dev"], multiple: false }])), { questionId: "b", text: "Which branch?", options: ["main", "dev"] });
  assert.equal(inlineQuestion(question([{ id: "b", text: "Which?", options: ["a", "b"], multiple: true }])), null);
  assert.equal(inlineQuestion(question([{ id: "b", text: "Which?", options: ["1", "2", "3", "4", "5"], multiple: false }])), null);
  assert.equal(inlineQuestion(question([{ id: "a", text: "A?", options: ["y"], multiple: false }, { id: "b", text: "B?", options: ["y"], multiple: false }])), null);
  assert.equal(inlineQuestion(approval("x", "")), null);
});

test("a compact row shows the narrowest Allow and a plain Decline, with every other choice in its menu", () => {
  const actions = compactApprovalActions([
    { id: "allow", label: "Allow once", intent: "allow", scope: "once" }, { id: "session", label: "Allow for this session", intent: "allow", scope: "session" },
    { id: "deny", label: "Decline", intent: "deny" }, { id: "cancel", label: "Stop task", intent: "cancel" },
    { id: "always", label: "Always allow this host", intent: "allow", scope: "persistent" }]);
  assert.deepEqual([actions.allow?.option.id, actions.decline?.option.id, actions.more.map((action) => action.option.id)], ["allow", "deny", ["session", "always", "cancel"]]);
  assert.equal(compactApprovalActions([{ id: "cancel", label: "Stop", intent: "cancel" }]).decline, null);
});
