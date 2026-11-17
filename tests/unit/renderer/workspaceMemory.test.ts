import assert from "node:assert/strict";
import test from "node:test";
import { notesForMemoryScope, resolveMemoryWorkspace } from "@/components/app/logic/workspaceMemory";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { BotMemoryEntry } from "@shared/types/bots/bots.types";

const workspace: NativeWorkspace = {
  id: "native-workspace", name: "Project", shellProjectId: "shell-project", kind: "repository",
  workspace: { projectId: "native-workspace", environmentId: "local", checkoutId: "main", path: "/project", branch: "main", access: "write", versionControl: "git" }
};
const other: NativeWorkspace = { ...workspace, id: "other-workspace", shellProjectId: "other-project" };

function note(id: string, workspaceId: string | null): BotMemoryEntry {
  return { id, workspaceId, botId: "nora", text: id, source: { kind: "user" }, createdAt: "2026-11-16T00:00:00.000Z", updatedAt: "2026-11-16T00:00:00.000Z" };
}

test("memory resolves the shell project's native identity rather than another focused workspace", () => {
  assert.equal(resolveMemoryWorkspace([workspace, other], "shell-project", other.id), workspace);
  assert.equal(resolveMemoryWorkspace([workspace, other], "missing", other.id), null);
});

test("memory supports native-only workspaces and an empty workspace selection", () => {
  const personal: NativeWorkspace = { ...workspace, id: "personal", shellProjectId: undefined, kind: "personal" };
  assert.equal(resolveMemoryWorkspace([workspace, personal], null, personal.id), personal);
  assert.equal(resolveMemoryWorkspace([workspace], null, null), null);
});

test("workspace memory includes everywhere notes and excludes other workspaces, preserving order", () => {
  const notes = [note("global", null), note("local-1", workspace.id), note("other", other.id), note("local-2", workspace.id)];
  assert.deepEqual(notesForMemoryScope(notes, { kind: "workspace", workspace }), [notes[0], notes[1], notes[3]]);
  assert.deepEqual(notesForMemoryScope(notes, { kind: "workspace", workspace: { ...workspace, id: "empty" } }), [notes[0]]);
  assert.equal(notesForMemoryScope(notes, { kind: "all", workspaces: [workspace], currentWorkspace: workspace }), notes);
});

test("Personal shows Nora's everywhere memories even without Personal-specific notes", () => {
  const personal: NativeWorkspace = { ...workspace, id: "personal", shellProjectId: undefined, kind: "personal" };
  const notes = [note("global", null), note("project-only", workspace.id)];
  assert.deepEqual(notesForMemoryScope(notes, { kind: "workspace", workspace: personal }), [notes[0]]);
  assert.deepEqual(notesForMemoryScope([], { kind: "workspace", workspace: personal }), []);
});
