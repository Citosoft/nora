import assert from "node:assert/strict";
import test from "node:test";
import { buildAttentionToasts, inlineQuestion } from "@/components/app/logic/attentionToasts";
import { describeAttention } from "@shared/conversations/attention";
import { compactApprovalActions } from "@/components/app/logic/approvalActions";
import { snapshotBot } from "@shared/bots/snapshot";
import type { Conversation, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { InboxItem } from "@shared/types/inbox/inbox.types";
import { bot } from "../shared/bots/fixtures";
import { conversation } from "../main/nora-tools/fixture";

const approval = (id: string, createdAt: string, status: RuntimeRequest["status"] = "pending"): RuntimeRequest => ({ kind: "approval", id, runId: "r", attemptId: "a",
  nativeId: id, status, createdAt, expiresAt: "", title: "Run npm test?", options: [{ id: "allow", label: "Allow" }] });
const requestItem = (entry: Conversation, request: RuntimeRequest, parent: Conversation | null = null): InboxItem => ({ kind: "request", id: `request:${request.id}`,
  workspaceId: "personal", occurredAt: request.createdAt, readAt: null, snoozedUntil: null, conversation: entry, request, notice: describeAttention(entry, parent, request) });

test("toasts cover waiting requests in the threads picked, oldest first, and skip dismissed ones and workflow stages", () => {
  const nora = conversation("nora");
  const rex = conversation("rex", { parentId: "nora", bot: snapshotBot(bot("rex")) });
  const viewed = conversation("viewed");
  const workflow = conversation("workflow", { source: { kind: "workflow", projectId: "project", runId: "run", stageId: "stage" } });
  const items = [requestItem(nora, approval("n1", "2026-11-13T00:00:03Z")), requestItem(rex, approval("r1", "2026-11-13T00:00:01Z"), nora),
    requestItem(viewed, approval("v1", "2026-11-13T00:00:00Z")), requestItem(workflow, approval("w1", "2026-11-13T00:00:00Z"))];
  const include = (entry: Conversation) => entry.id !== "viewed";
  const toasts = buildAttentionToasts(items, include, new Set());
  assert.deepEqual(toasts.map((toast) => [toast.request.id, toast.notice.title, toast.notice.body]),
    [["r1", "Rex needs your approval", "Run npm test? · asked by Nora"], ["n1", "nora needs your approval", "Run npm test?"]]);
  assert.deepEqual(buildAttentionToasts(items, include, new Set(["r1"])).map((toast) => toast.request.id), ["n1"]);
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
