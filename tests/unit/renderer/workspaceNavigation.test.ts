import assert from "node:assert/strict";
import { test } from "node:test";
import { availableWorkspaceTools, toggleWorkspaceToolPin, workspaceToolPins } from "@/components/app/logic/workspace-navigation/tools";
import { parseSidebarPreferences } from "@/components/app/logic/workspace-navigation/preferences";
import { resolveWorkspaceToolRoute } from "@/components/app/logic/workspace-navigation/routes";
import { workspaceActivity } from "@/components/app/logic/workspace-navigation/activity";
import type { ProjectSummary } from "@shared/appTypes";

const project: ProjectSummary = { id: "a", name: "A", rootPath: "/a", versionControl: "git", gitCommonDir: "/a/.git", baseBranch: "main", framework: null, platform: "darwin", createdAt: "", updatedAt: "", lastOpenedAt: "" };

test("role defaults map aliases, deduplicate and filter capabilities before limiting shortcuts", () => {
  const all = availableWorkspaceTools(true);
  assert.deepEqual(workspaceToolPins({ id: "developer" }, all), ["files", "changes", "terminals"]);
  assert.deepEqual(workspaceToolPins({ id: "designer" }, all), ["files", "browser", "documents"]);
  assert.deepEqual(workspaceToolPins({ id: "writing" }, all), ["files", "documents"]);
  assert.deepEqual(workspaceToolPins({ id: "developer" }, availableWorkspaceTools(false)), ["files", "terminals", "browser"]);
  assert.deepEqual(workspaceToolPins(null, all), ["files", "tasks", "documents"]);
});

test("saved pins override role changes, preserve explicit empty choices and keep unavailable pins", () => {
  const saved = parseSidebarPreferences(JSON.stringify({ pinnedWorkspaceIds: ["a", "closed"], toolPins: { a: ["changes", "files"], b: [] } }));
  assert.deepEqual(workspaceToolPins({ id: "product" }, availableWorkspaceTools(true), saved.toolPins.a), ["changes", "files"]);
  assert.deepEqual(workspaceToolPins({ id: "developer" }, availableWorkspaceTools(true), saved.toolPins.b), []);
  assert.deepEqual(workspaceToolPins(null, availableWorkspaceTools(false), saved.toolPins.a), ["files"]);
  assert.deepEqual(toggleWorkspaceToolPin(saved.toolPins.a!, "tasks"), ["changes", "files", "tasks"]);
  assert.deepEqual(toggleWorkspaceToolPin(saved.toolPins.a!, "files"), ["changes"]);
  assert.deepEqual(saved.pinnedWorkspaceIds, ["a", "closed"]);
  assert.deepEqual(parseSidebarPreferences(JSON.stringify(saved)), saved);
});

test("malformed preferences recover to defaults", () => {
  for (const raw of [null, "{", "null", '{"toolPins": {"a": ["invalid"]}, "pinnedWorkspaceIds": []}']) {
    assert.deepEqual(parseSidebarPreferences(raw), { pinnedWorkspaceIds: [], toolPins: {} });
  }
});

test("tool navigation is scoped to workspace, capability and thread focus revision", () => {
  const route = { projectId: "a", tool: "changes", focusRevision: 2 } as const;
  assert.equal(resolveWorkspaceToolRoute(route, "a", 2, project), route);
  assert.equal(resolveWorkspaceToolRoute(route, "b", 2, project), null);
  assert.equal(resolveWorkspaceToolRoute(route, "a", 3, project), null);
  assert.equal(resolveWorkspaceToolRoute(route, null, 2, null), null);
  assert.equal(resolveWorkspaceToolRoute(route, "a", 2, { ...project, versionControl: "none" }), null);
  assert.equal(resolveWorkspaceToolRoute(null, "a", 2, project), null);
});

test("workspace activity includes workflow runs without leaking unmapped or other-workspace threads", () => {
  const threads = [{ workspaceId: "native-a", active: true, attention: true }, { workspaceId: "native-b", active: true, attention: true }];
  const terminals = [{ status: "running", isBusy: true }, { status: "running", isBusy: false }, { status: "stopped", isBusy: true }] as const;
  const runs = [{ projectId: "a", status: "running" }, { projectId: "a", status: "paused" }, { projectId: "b", status: "running" }, { projectId: "a", status: "completed" }] as const;
  assert.deepEqual(workspaceActivity("a", "native-a", threads, terminals, runs), { running: 3, attention: 2 });
  assert.deepEqual(workspaceActivity("a", undefined, threads, [], []), { running: 0, attention: 0 });
});
