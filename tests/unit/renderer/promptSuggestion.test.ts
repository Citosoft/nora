import assert from "node:assert/strict";
import test from "node:test";
import { composerKeyAction, selectPromptSuggestion, visiblePromptSuggestion } from "@/components/app/logic/promptSuggestion";
import { applyNativeEvent } from "@/components/app/logic/nativeConversationState";
import { loadNativeRunHistory } from "@/components/app/logic/nativeRunHistory";
import type { NativeConversationView } from "@/components/app/types/nativeConversation.types";
import type { ConversationClient } from "@/components/app/types/conversationClient.types";
import type { ConversationRun } from "@shared/types/conversation/contracts.types";
import { pickerCatalog } from "./modelPickerFixtures";
import { threadSummary, threadWorkspaceFixture } from "./threadWorkspaceFixtures";

const capabilities = { ...pickerCatalog().catalog.capabilities, promptSuggestions: true };
function run(id: string, promptSuggestion?: string): ConversationRun {
  return { id, conversationId: "existing", instruction: id, state: "completed", attemptId: id, nativeTurnId: id,
    createdAt: "2026-11-11T10:00:00.000Z", updatedAt: "2026-11-11T10:01:00.000Z", failure: null, usage: null, review: "ready",
    ...(promptSuggestion ? { promptSuggestion } : {}) };
}
function view(runs: ConversationRun[]): NativeConversationView {
  return { header: { schemaVersion: 1, cursor: 0, conversation: threadSummary().conversation, activeRuns: [], queuedRuns: [], pendingRequests: [] },
    items: [], nextBefore: null, runHistory: { runs, nextBefore: null } };
}

test("only the latest completed turn of a supporting provider supplies a suggestion", () => {
  const current = view([run("older", "Old suggestion"), run("latest", "New suggestion")]);
  assert.deepEqual(selectPromptSuggestion(current, capabilities), { runId: "latest", text: "New suggestion" });
  assert.equal(selectPromptSuggestion(current, pickerCatalog().catalog.capabilities), null);
  assert.equal(selectPromptSuggestion(current, null), null);
  assert.equal(selectPromptSuggestion(view([run("older", "Old suggestion"), run("latest")]), capabilities), null);
  for (const state of ["queued", "running", "failed", "interrupted"] as const) {
    assert.equal(selectPromptSuggestion(view([{ ...run("latest", "Suggestion"), state }]), capabilities), null);
  }
  assert.equal(selectPromptSuggestion({ ...current, header: { ...current.header, activeRuns: [{ ...run("active"), state: "running" }] } }, capabilities), null);
  assert.equal(selectPromptSuggestion({ ...current, header: { ...current.header, queuedRuns: [{ ...run("queued"), state: "queued" }] } }, capabilities), null);
  assert.equal(selectPromptSuggestion({ ...current, header: { ...current.header, conversation: { ...current.header.conversation, archivedAt: "2026-11-11T11:00:00.000Z" } } }, capabilities), null);
});

test("a late suggestion from an older turn never displaces the latest turn, even with equal timestamps", () => {
  const initial = view([run("older"), run("latest", "Current suggestion")]);
  const updated = applyNativeEvent(initial, { schemaVersion: 1, id: "late", cursor: 1, conversationId: "existing", at: "2026-11-11T10:02:00.000Z",
    payload: { kind: "run", run: run("older", "Late old suggestion") } });
  assert.deepEqual(updated.runHistory.runs.map((entry) => entry.id), ["older", "latest"]);
  assert.equal(selectPromptSuggestion(updated, capabilities)?.text, "Current suggestion");
});

test("paginated run history preserves chronological order when an older turn is required", async () => {
  const client: ConversationClient = { ...threadWorkspaceFixture().deps.client, async history(query) {
    assert.equal(query.scope, "runs");
    return { schemaVersion: 1, conversationId: query.conversationId, scope: "runs", cursor: 0,
      nextBefore: query.before ? null : 3, runs: query.before ? [run("first"), run("second")] : [run("latest", "Current suggestion")] };
  } };
  const history = await loadNativeRunHistory(client, "existing", [{ kind: "message", id: "old-message", runId: "first", role: "user",
    text: "First instruction", complete: true, createdAt: "2026-11-11T10:00:00.000Z" }]);
  assert.deepEqual(history.runs.map((entry) => entry.id), ["first", "second", "latest"]);
});

test("drafts, disabled inputs and dismissed or accepted suggestions never show ghost text", () => {
  const suggestion = { runId: "turn", text: "Suggested instruction" };
  assert.equal(visiblePromptSuggestion(suggestion, "", false, null), suggestion);
  assert.equal(visiblePromptSuggestion(suggestion, "My draft", false, null), null);
  assert.equal(visiblePromptSuggestion(suggestion, " ", false, null), null);
  assert.equal(visiblePromptSuggestion(suggestion, "", true, null), null);
  assert.equal(visiblePromptSuggestion(suggestion, "", false, "turn"), null);
  assert.equal(visiblePromptSuggestion({ ...suggestion, runId: "next-turn" }, "", false, "turn")?.runId, "next-turn");
});

test("Tab accepts without submitting, modified Tab keeps navigation, and Enter retains its existing behavior", () => {
  const input = { key: "Tab", shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, composing: false, hasSuggestion: true };
  assert.equal(composerKeyAction(input), "accept-suggestion");
  assert.equal(composerKeyAction({ ...input, hasSuggestion: false }), null);
  assert.equal(composerKeyAction({ ...input, shiftKey: true }), null);
  assert.equal(composerKeyAction({ ...input, ctrlKey: true }), null);
  assert.equal(composerKeyAction({ ...input, metaKey: true }), null);
  assert.equal(composerKeyAction({ ...input, composing: true }), null);
  assert.equal(composerKeyAction({ ...input, key: "Escape" }), "dismiss-suggestion");
  assert.equal(composerKeyAction({ ...input, key: "Enter" }), "submit");
  assert.equal(composerKeyAction({ ...input, key: "Enter", ctrlKey: true }), "submit");
  assert.equal(composerKeyAction({ ...input, key: "Enter", shiftKey: true }), null);
});
