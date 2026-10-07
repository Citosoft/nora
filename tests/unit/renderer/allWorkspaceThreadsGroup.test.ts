import { buildAllThreadsGroupSections, limitAllThreadsGroupSections } from "@/components/app/logic/allWorkspaceThreadsGroup";
import type { AllWorkspaceThreadListEntry } from "@/components/app/types/workspaceSidebarAllThreads.types";
import assert from "node:assert/strict";
import test from "node:test";

function createEntry(overrides: Partial<AllWorkspaceThreadListEntry> = {}): AllWorkspaceThreadListEntry {
  return {
    workspaceId: "project-a",
    workspaceName: "Alpha",
    workspaceRootPath: "/tmp/alpha",
    thread: {
      toolId: "codex",
      toolLabel: "Codex",
      conversationId: "session-a",
      primaryArtifactPath: "/tmp/alpha/session-a.jsonl",
      sessionLabel: "Codex session",
      threadTitle: "Fix sidebar",
      workspacePath: "/tmp/alpha",
      lastUpdatedAt: "2026-07-20T10:00:00.000Z",
      latestPreview: "Preview",
      entryCount: 2,
      estimate: {
        characters: 100,
        estimatedTokens: 25
      }
    },
    ...overrides
  };
}

test("buildAllThreadsGroupSections groups threads by workspace with recent entries first", () => {
  const sections = buildAllThreadsGroupSections([
    createEntry({
      workspaceId: "project-b",
      workspaceName: "Beta",
      thread: {
        ...createEntry().thread,
        conversationId: "old",
        primaryArtifactPath: "/tmp/beta/old.jsonl",
        lastUpdatedAt: "2026-07-20T09:00:00.000Z"
      }
    }),
    createEntry({
      workspaceId: "project-b",
      workspaceName: "Beta",
      thread: {
        ...createEntry().thread,
        conversationId: "new",
        primaryArtifactPath: "/tmp/beta/new.jsonl",
        lastUpdatedAt: "2026-07-20T11:00:00.000Z"
      }
    }),
    createEntry()
  ], "workspace");

  assert.deepEqual(sections.map((section) => section.groupLabel), ["Alpha", "Beta"]);
  assert.deepEqual(
    sections.find((section) => section.groupLabel === "Beta")?.entries.map((entry) => entry.thread.conversationId),
    ["new", "old"]
  );
});

test("buildAllThreadsGroupSections groups threads by harness", () => {
  const sections = buildAllThreadsGroupSections([
    createEntry(),
    createEntry({
      thread: {
        ...createEntry().thread,
        toolId: "claude",
        toolLabel: "Claude",
        conversationId: "claude-session",
        primaryArtifactPath: "/tmp/alpha/claude.jsonl"
      }
    })
  ], "harness");

  assert.deepEqual(sections.map((section) => section.groupLabel), ["Claude", "Codex"]);
});

test("buildAllThreadsGroupSections keeps a flat recent-first list", () => {
  const sections = buildAllThreadsGroupSections([
    createEntry({ thread: { ...createEntry().thread, conversationId: "older", lastUpdatedAt: null } }),
    createEntry({
      thread: {
        ...createEntry().thread,
        conversationId: "newer",
        primaryArtifactPath: "/tmp/alpha/newer.jsonl",
        lastUpdatedAt: "2026-07-20T12:00:00.000Z"
      }
    })
  ], "none");

  assert.equal(sections.length, 1);
  assert.equal(sections[0]?.groupLabel, "");
  assert.deepEqual(sections[0]?.entries.map((entry) => entry.thread.conversationId), ["newer", "older"]);
});

test("limitAllThreadsGroupSections shows the most recent threads until a section is expanded", () => {
  const entries = Array.from({ length: 7 }, (_, index) =>
    createEntry({
      thread: {
        ...createEntry().thread,
        conversationId: `session-${index}`,
        primaryArtifactPath: `/tmp/alpha/session-${index}.jsonl`,
        lastUpdatedAt: `2026-07-20T10:0${index}:00.000Z`
      }
    })
  );
  const sections = buildAllThreadsGroupSections(entries, "workspace");

  const [collapsed] = limitAllThreadsGroupSections(sections, new Set(), 5);
  assert.deepEqual(
    collapsed.visibleEntries.map((entry) => entry.thread.conversationId),
    ["session-6", "session-5", "session-4", "session-3", "session-2"]
  );
  assert.equal(collapsed.overflowEntryCount, 2);
  assert.equal(collapsed.isExpanded, false);

  const [expanded] = limitAllThreadsGroupSections(sections, new Set([collapsed.groupKey]), 5);
  assert.equal(expanded.visibleEntries.length, 7);
  assert.equal(expanded.isExpanded, true);
});

test("limitAllThreadsGroupSections reports no overflow for short sections", () => {
  const [section] = limitAllThreadsGroupSections(buildAllThreadsGroupSections([createEntry()], "none"), new Set(), 5);
  assert.equal(section.visibleEntries.length, 1);
  assert.equal(section.overflowEntryCount, 0);
});
