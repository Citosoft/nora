import type { ConversationRun } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { InboxCommand, InboxLedger, InboxSnapshot } from "@shared/types/inbox/inbox.types";
import { projectInbox } from "@shared/inbox/projection";
import type { DemoStore } from "@/types/demo.types";

function latestRunSummary(run: ConversationRun | undefined): ConversationSummary["latestRun"] {
  return run ? { id: run.id, state: run.state, createdAt: run.createdAt, updatedAt: run.updatedAt, failure: run.failure } : null;
}
export function demoSummaries(store: DemoStore): ConversationSummary[] {
  return [...store.threads.values()].map(view => ({ conversation: view.header.conversation,
    latestRun: latestRunSummary(view.runHistory.runs.at(-1)), queuedCount: view.header.queuedRuns.length, pendingRequestCount: view.header.pendingRequests.length }));
}
export function createDemoInbox(store: DemoStore) {
  const ledger: InboxLedger = { version: 1, baselineAt: new Date(0).toISOString(), marks: {} };
  const read = (): InboxSnapshot => projectInbox({ summaries: demoSummaries(store),
    requests: [...store.threads.values()].flatMap(view => view.header.pendingRequests.map(request => ({ conversation: view.header.conversation, parent: null, request }))),
    workflows: [], connectors: [], alerts: [], previews: new Map([...store.threads.values()].flatMap(view => view.items.flatMap(item =>
      item.kind === "message" && item.role === "assistant" ? [[item.runId, item.text.slice(0, 280)] as const] : []))) }, ledger, store.now()).snapshot;
  const update = (command: InboxCommand): InboxSnapshot => {
    const ids = command.kind === "mark-thread-read" ? read().items.flatMap(item => "conversation" in item && item.conversation.id === command.conversationId ? [item.id] : []) : command.itemIds;
    for (const id of ids) {
      const mark = ledger.marks[id] ?? {};
      switch (command.kind) {
        case "mark-read": case "mark-thread-read": mark.readAt = store.now(); break;
        case "mark-unread": delete mark.readAt; break;
        case "mark-done": mark.doneAt = store.now(); break;
        case "snooze": mark.snoozedUntil = command.until; break;
        case "unsnooze": delete mark.snoozedUntil; break;
      }
      ledger.marks[id] = mark;
    }
    return read();
  };
  return { read, update };
}
