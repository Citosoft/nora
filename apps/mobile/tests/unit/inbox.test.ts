import { describe, expect, it } from "vitest";
import type { Conversation, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { ConversationDetailResponse } from "@shared/types/remote-access/runtimeApi.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { InboxItem } from "@shared/types/inbox/inbox.types";
import { inboxEntryOptions, legacyInbox, legacyInboxConversations, mobileInboxSections } from "@/state/inbox";

const at = "2026-11-18T10:00:00.000Z";
const conversation = (id: string, extra: Partial<Conversation> = {}): Conversation => ({ id, title: id, parentId: null, nativeConversationId: null, archivedAt: null,
  workspace: { environmentId: "local", projectId: "w", checkoutId: "c", path: "/w", branch: "main", access: "write", versionControl: "git" },
  provider: { kind: "claude", instanceId: "claude", model: "m", reasoning: null, permissionPolicy: "default" }, role: null, createdAt: at, updatedAt: at, queuePaused: false, ...extra });
const request: RuntimeRequest = { kind: "approval", id: "q", runId: "r", attemptId: "a", nativeId: "q", status: "pending", createdAt: at, expiresAt: at,
  title: "Deploy?", options: [{ id: "allow", label: "Allow" }] };
const summary = (entry: Conversation, pendingRequestCount: number): ConversationSummary => ({ conversation: entry, latestRun: null, queuedCount: 0, pendingRequestCount });

describe("inbox", () => {
  it("builds requests for older computers with the desktop's own projection", () => {
    const parent = conversation("chat", { title: "Launch" });
    const child = conversation("rex", { parentId: "chat" });
    const summaries = [summary(parent, 0), summary(child, 1)];
    expect(legacyInboxConversations(summaries)).toEqual(["rex"]);
    const detail = { header: { schemaVersion: 1, cursor: 0, conversation: child, activeRuns: [], queuedRuns: [], pendingRequests: [request] } } as unknown as ConversationDetailResponse;
    const items = legacyInbox(summaries, [detail], "2026-11-18T12:00:00.000Z");
    expect(items.map((item) => [item.id, item.kind === "request" ? item.notice.body : null])).toEqual([["request:q", "Deploy? · asked by Nora"]]);
  });

  it("groups awake items by tier and keeps snoozed ones apart, offering marks by tier", () => {
    const outcome: InboxItem = { kind: "outcome", id: "o", workspaceId: "w", occurredAt: at, readAt: null, snoozedUntil: null, conversation: conversation("t"),
      run: { id: "r", state: "completed", createdAt: at, updatedAt: at, failure: null }, preview: "Done" };
    const snoozed: InboxItem = { ...outcome, id: "s", snoozedUntil: "2026-11-19T00:00:00.000Z" };
    expect(mobileInboxSections([outcome, snoozed], "2026-11-18T12:00:00.000Z").map((section) => [section.id, section.items.map((item) => item.id)]))
      .toEqual([["updates", ["o"]], ["snoozed", ["s"]]]);
    const commands: unknown[] = [];
    const options = inboxEntryOptions(outcome, new Date("2026-11-18T12:00:00.000Z"), (command) => commands.push(command));
    expect(options.map((option) => option.label)).toEqual(["Mark as read", "Done", "Snooze until tomorrow"]);
    options[1]?.onPress();
    expect(commands).toEqual([{ kind: "mark-done", itemIds: ["o"] }]);
  });
});
