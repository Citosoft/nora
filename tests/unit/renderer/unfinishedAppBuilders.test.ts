import assert from "node:assert/strict";
import test from "node:test";
import { unfinishedAppBuilders } from "@/components/app/logic/apps/unfinishedBuilders";
import { threadSummary } from "./threadWorkspaceFixtures";
import type { AppSummary } from "@shared/types/apps/apps.types";

test("unfinished builders remain reachable, including paused queues and deleted app references", () => {
  const paused = threadSummary("paused");
  paused.conversation.source = { kind: "app", appId: null };
  paused.conversation.queuePaused = true;
  paused.queuedCount = 1;
  const removed = threadSummary("removed");
  removed.conversation.source = { kind: "app", appId: "deleted-app" };
  const archived = structuredClone(removed);
  archived.conversation.id = "archived";
  archived.conversation.archivedAt = archived.conversation.updatedAt;
  const remote = structuredClone(removed);
  remote.conversation.workspace.environmentId = "other-host";
  const regular = threadSummary("regular");
  assert.deepEqual(unfinishedAppBuilders([paused, removed, archived, remote, regular], [], paused.conversation.workspace.environmentId)
    .map(({ conversation }) => conversation.id).sort(), ["paused", "removed"]);
});

test("saved builders are reached through their apps, matched by thread or app id", () => {
  const byThread = threadSummary("by-thread");
  byThread.conversation.source = { kind: "app", appId: null };
  const byApp = threadSummary("by-app");
  byApp.conversation.source = { kind: "app", appId: "saved-app" };
  const apps: AppSummary[] = [{ id: "saved-app", name: "Dashboard", icon: "layout-dashboard", workspaceId: "personal",
    threadId: "by-thread", trusted: false, createdAt: byThread.conversation.createdAt, updatedAt: byThread.conversation.updatedAt,
    version: 1, connectorIds: [], suggestions: [] }];
  assert.deepEqual(unfinishedAppBuilders([byThread, byApp], apps, byThread.conversation.workspace.environmentId), []);
});
