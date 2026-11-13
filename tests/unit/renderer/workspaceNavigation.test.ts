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
  assert.deepEqual(workspaceToolPins({ id: "developer" }, all), ["terminals", "browser"]);
  assert.deepEqual(workspaceToolPins({ id: "designer" }, all), ["browser", "documents"]);
  assert.deepEqual(workspaceToolPins({ id: "writing" }, all), ["documents"]);
  assert.deepEqual(workspaceToolPins({ id: "developer" }, availableWorkspaceTools(false)), ["terminals", "browser"]);
  assert.deepEqual(workspaceToolPins(null, all), ["tasks", "documents"]);
});

test("saved pins override role changes, preserve explicit empty choices and keep unavailable pins", () => {
  const saved = parseSidebarPreferences(JSON.stringify({ pinnedWorkspaceIds: ["a", "closed"], toolPins: { a: ["worktrees", "documents"], b: [] } }));
  assert.deepEqual(workspaceToolPins({ id: "product" }, availableWorkspaceTools(true), saved.toolPins.a), ["worktrees", "documents"]);
  assert.deepEqual(workspaceToolPins({ id: "developer" }, availableWorkspaceTools(true), saved.toolPins.b), []);
  assert.deepEqual(workspaceToolPins(null, availableWorkspaceTools(false), saved.toolPins.a), ["documents"]);
  assert.deepEqual(toggleWorkspaceToolPin(saved.toolPins.a!, "tasks"), ["worktrees", "documents", "tasks"]);
  assert.deepEqual(toggleWorkspaceToolPin(saved.toolPins.a!, "documents"), ["worktrees"]);
  assert.deepEqual(saved.pinnedWorkspaceIds, ["a", "closed"]);
  assert.deepEqual(parseSidebarPreferences(JSON.stringify(saved)), saved);
});

test("malformed preferences recover to defaults", () => {
  for (const raw of [null, "{", "null", '{"toolPins": {"a": ["invalid"]}, "pinnedWorkspaceIds": []}']) {
    assert.deepEqual(parseSidebarPreferences(raw), { sidebarMode: "threads", pinnedWorkspaceIds: [], toolPins: {}, threadGrouping: "none", memberThreads: "visible", threadSourceFilter: "all", threadSort: "recent", workspaceAvatarColors: {}, workspaceViews: {} });
  }
});

test("thread grouping migrates existing preferences, persists choices and preserves pins on invalid grouping", () => {
  const legacy = { pinnedWorkspaceIds: ["a"], toolPins: { a: ["documents"] } };
  assert.deepEqual(parseSidebarPreferences(JSON.stringify(legacy)), { ...legacy, sidebarMode: "threads", threadGrouping: "none", memberThreads: "visible", threadSourceFilter: "all", threadSort: "recent", workspaceAvatarColors: {}, workspaceViews: {} });
  for (const threadGrouping of ["none", "workspace", "activity", "source", "provider"]) {
    const saved = { ...legacy, sidebarMode: "bots", threadGrouping, memberThreads: "hidden", threadSourceFilter: "all", threadSort: "recent", workspaceAvatarColors: {}, workspaceViews: {} };
    assert.deepEqual(parseSidebarPreferences(JSON.stringify(saved)), saved);
  }
  assert.deepEqual(parseSidebarPreferences(JSON.stringify({ ...legacy, threadGrouping: "invalid" })), { ...legacy, sidebarMode: "threads", threadGrouping: "none", memberThreads: "visible", threadSourceFilter: "all", threadSort: "recent", workspaceAvatarColors: {}, workspaceViews: {} });
});

test("tool navigation is scoped to workspace and capability", () => {
  const route = { projectId: "a", tool: "worktrees" } as const;
  assert.equal(resolveWorkspaceToolRoute(route, "a", project), route);
  assert.equal(resolveWorkspaceToolRoute(route, "b", project), null);
  assert.equal(resolveWorkspaceToolRoute(route, null, null), null);
  assert.equal(resolveWorkspaceToolRoute(route, "a", { ...project, versionControl: "none" }), null);
  assert.equal(resolveWorkspaceToolRoute(null, "a", project), null);
});

test("workspace activity includes workflow runs without leaking unmapped or other-workspace threads", () => {
  const threads = [{ workspaceId: "native-a", active: true, attention: true }, { workspaceId: "native-b", active: true, attention: true }];
  const terminals = [{ status: "running", isBusy: true }, { status: "running", isBusy: false }, { status: "stopped", isBusy: true }] as const;
  const runs = [{ projectId: "a", status: "running" }, { projectId: "a", status: "paused" }, { projectId: "b", status: "running" }, { projectId: "a", status: "completed" }] as const;
  assert.deepEqual(workspaceActivity("a", "native-a", threads, terminals, runs), { running: 3, attention: 2 });
  assert.deepEqual(workspaceActivity("a", undefined, threads, [], []), { running: 0, attention: 0 });
});

test("retired Files and Changes views cannot reopen and their pins are removed without losing preferences", () => {
  const saved = parseSidebarPreferences(JSON.stringify({
    pinnedWorkspaceIds: ["a"], threadGrouping: "activity",
    toolPins: { a: ["files", "documents", "changes", "development", "browser"] },
    workspaceViews: {
      a: { activeTool: "files", documentPath: "notes/keep.md" },
      b: { activeTool: "changes" },
      c: { activeTool: "worktrees" }
    }
  }));
  assert.deepEqual(saved.toolPins.a, ["documents", "browser"]);
  assert.deepEqual(saved.pinnedWorkspaceIds, ["a"]);
  assert.equal(saved.threadGrouping, "activity");
  assert.equal(saved.workspaceViews.a?.activeTool, null);
  assert.equal(saved.workspaceViews.b?.activeTool, null);
  assert.equal(saved.workspaceViews.a?.documentPath, "notes/keep.md");
  assert.equal(saved.workspaceViews.c?.activeTool, "worktrees");
  assert.deepEqual(parseSidebarPreferences(JSON.stringify(saved)), saved);
  assert.deepEqual(availableWorkspaceTools(true), ["worktrees", "documents", "tasks", "terminals", "browser", "workflows"]);
});

test("thread source filters persist and invalid or older preferences retain other saved choices", () => {
  const original = parseSidebarPreferences(JSON.stringify({ pinnedWorkspaceIds: ["a"], toolPins: {}, threadGrouping: "source" }));
  assert.equal(original.threadSourceFilter, "all");
  for (const threadSourceFilter of ["all", "nora", "external", "codex-cli", "codex-desktop", "claude-cli", "claude-desktop"] as const) {
    const saved = { ...original, threadSourceFilter };
    assert.deepEqual(parseSidebarPreferences(JSON.stringify(saved)), saved);
  }
  const recovered = parseSidebarPreferences(JSON.stringify({ ...original, threadSourceFilter: "invalid" }));
  assert.equal(recovered.threadSourceFilter, "all");
  assert.equal(recovered.threadGrouping, "source");
  assert.deepEqual(recovered.pinnedWorkspaceIds, ["a"]);
});
