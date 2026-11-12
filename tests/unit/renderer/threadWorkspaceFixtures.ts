import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { Conversation, ConversationCommand } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { ConversationClient, ConversationListener } from "@/components/app/types/conversationClient.types";
import type { ThreadLayout, ThreadLayoutPersistence } from "@/components/app/types/thread-workspace/state.types";
import { pickerCatalog, pickerWorkspace, codexProvider } from "./modelPickerFixtures";
import { snapshotRole } from "@shared/personalization/profiles";

export const threadBoot: NativeBoot = { environmentId: "local", cursor: 0,
  personalization: { defaultRole: { id: "general" }, workspaceRoles: {} }, providers: [codexProvider],
  workspaces: [{ id: "personal", name: "Personal", kind: "personal", workspace: pickerWorkspace },
    { id: "project", name: "Project", kind: "folder", shellProjectId: "shell", workspace: { ...pickerWorkspace, projectId: "project", checkoutId: "git", path: "/project", branch: "main", versionControl: "git" } }] };
export const threadBinding = { kind: "codex" as const, instanceId: "account", model: "first", reasoning: null, permissionPolicy: "read" };
export function threadSummary(id = "existing"): ConversationSummary {
  return { conversation: { nativeConversationId: null, id, title: "Existing task", parentId: null, workspace: pickerWorkspace, provider: threadBinding,
    role: snapshotRole({ id: "writing" }), createdAt: "2026-11-09T10:00:00.000Z", updatedAt: "2026-11-09T10:00:00.000Z", archivedAt: null, queuePaused: false },
  latestRun: null, queuedCount: 0, pendingRequestCount: 0 };
}

/** In-memory host fixture: receipts are idempotent and never invoke a provider. */
export function threadWorkspaceFixture() {
  let saved: ThreadLayout | null = null;
  let unavailable = false, loseReply = false, sequence = 0, summaryReads = 0;
  const commands: ConversationCommand[] = [];
  const listeners = new Set<ConversationListener>();
  const summaries: ConversationSummary[] = [threadSummary()];
  const accepted = new Set<string>();
  const persistence: ThreadLayoutPersistence = {
    read: () => saved ? structuredClone(saved) : null,
    write(value) { if (unavailable) throw new Error("Storage full"); saved = structuredClone(value); }
  };
  const client: ConversationClient = {
    async externalSessions() { return { status: "available", sessions: [] }; },
    async mcp() { return { kind: "unavailable", message: "No MCP in this fixture" }; },
    async skills() { return { kind: "unavailable", message: "No skills in this fixture" }; },
    async context() { return null; },
    async execute(command) {
      commands.push(command);
      if (!accepted.has(command.commandId)) {
        accepted.add(command.commandId);
        if (command.kind === "create") {
          const conversation: Conversation = { nativeConversationId: null, id: command.conversationId, title: command.title, parentId: command.parentId,
            workspace: command.workspace, provider: command.provider, role: command.role ? snapshotRole(command.role) : null,
            createdAt: "2026-11-09T11:00:00.000Z", updatedAt: "2026-11-09T11:00:00.000Z", archivedAt: null, queuePaused: false };
          summaries.push({ conversation, latestRun: null, queuedCount: 0, pendingRequestCount: 0 });
        }
      }
      if (command.kind === "archive" || command.kind === "unarchive") {
        const summary = summaries.find((entry) => entry.conversation.id === command.conversationId);
        if (summary) summary.conversation.archivedAt = command.kind === "archive" ? "2026-11-09T11:00:00.000Z" : null;
      }
      if (loseReply && command.kind === "submit") { loseReply = false; throw new Error("Reply lost"); }
      return { commandId: command.commandId, conversationId: command.conversationId, acceptedAt: "2026-11-09T11:00:00.000Z", cursor: accepted.size };
    },
    async summaries() { summaryReads++; return structuredClone(summaries); },
    async header(id) {
      const conversation = summaries.find((entry) => entry.conversation.id === id)?.conversation;
      return conversation ? { schemaVersion: 1, cursor: 0, conversation, activeRuns: [], queuedRuns: [], pendingRequests: [] } : null;
    },
    async history(query) { return query.scope === "timeline"
      ? { schemaVersion: 1, conversationId: query.conversationId, scope: "timeline", cursor: 0, nextBefore: null, items: [] }
      : { schemaVersion: 1, conversationId: query.conversationId, scope: "runs", cursor: 0, nextBefore: null, runs: [] }; },
    async catalog() { return pickerCatalog(); },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
  };
  const deps = { boot: threadBoot, client, persistence, nextId: () => `view-${++sequence}`, now: () => "2026-11-09T11:00:00.000Z" };
  return { deps, commands, summaries, listeners, get saved() { return saved; }, get summaryReads() { return summaryReads; },
    get acceptedCount() { return accepted.size; }, setUnavailable(value: boolean) { unavailable = value; }, loseNextReply() { loseReply = true; } };
}
