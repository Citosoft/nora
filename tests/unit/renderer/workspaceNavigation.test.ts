import assert from "node:assert/strict";
import { test } from "node:test";
import { availableWorkspaceTools, DEFAULT_WORKSPACE_TOOL_PINS, toggleWorkspaceToolPin, workspaceToolPins } from "@/components/app/logic/workspace-navigation/tools";
import { parseSidebarPreferences } from "@/components/app/logic/workspace-navigation/preferences";
import { resolveWorkspaceToolRoute } from "@/components/app/logic/workspace-navigation/routes";
import { workspaceActivity } from "@/components/app/logic/workspace-navigation/activity";
import type { ProjectSummary } from "@shared/appTypes";
import type { WorkspaceToolId } from "@/components/app/types/workspaceNavigation.types";

const project: ProjectSummary = { id: "a", name: "A", rootPath: "/a", versionControl: "git", gitCommonDir: "/a/.git", baseBranch: "main", framework: null, platform: "darwin", createdAt: "", updatedAt: "", lastOpenedAt: "" };

test("workspace tools expose every tool and restrict worktrees to git projects", () => {
  assert.deepEqual(availableWorkspaceTools(true), ["worktrees", "merge-requests", "issues", "documents", "tasks", "terminals", "browser", "workflows"]);
  assert.deepEqual(availableWorkspaceTools(false), ["documents", "tasks", "terminals", "browser", "workflows"]);
});

test("tool pins default to common tools, respect saved order and allow hiding every tool", () => {
  const available = availableWorkspaceTools(true);
  assert.deepEqual(workspaceToolPins(available), ["terminals", "browser", "documents"]);
  assert.deepEqual(workspaceToolPins(available, []), []);
  assert.deepEqual(workspaceToolPins(available, ["tasks", "browser", "tasks"]), ["tasks", "browser"]);
});

test("pinning is reversible and preserves unavailable pins without mutating saved choices", () => {
  const saved = ["worktrees", "documents"] as const;
  assert.deepEqual(workspaceToolPins(availableWorkspaceTools(false), saved), ["documents"]);
  const updated = toggleWorkspaceToolPin(saved, "browser");
  assert.deepEqual(updated, ["worktrees", "documents", "browser"]);
  assert.deepEqual(toggleWorkspaceToolPin(updated, "documents"), ["worktrees", "browser"]);
  assert.deepEqual(saved, ["worktrees", "documents"]);
  assert.deepEqual(toggleWorkspaceToolPin(DEFAULT_WORKSPACE_TOOL_PINS, "browser"), ["terminals", "documents"]);
});

test("every available tool can be pinned and persisted independently per workspace", () => {
  const all = availableWorkspaceTools(true);
  const pins = all.reduce<WorkspaceToolId[]>((current, tool) => toggleWorkspaceToolPin(current, tool), []);
  const saved = parseSidebarPreferences(JSON.stringify({ pinnedWorkspaceIds: [], toolPins: { a: pins, b: [] } }));
  assert.deepEqual(workspaceToolPins(all, saved.toolPins.a), all);
  assert.deepEqual(workspaceToolPins(all, saved.toolPins.b), []);
  assert.deepEqual(parseSidebarPreferences(JSON.stringify(saved)), saved);
});

test("older saved tool pins round-trip without losing workspace preferences", () => {
  const saved = parseSidebarPreferences(JSON.stringify({ pinnedWorkspaceIds: ["a", "closed"], toolPins: { a: ["worktrees", "documents"], b: [] } }));
  assert.deepEqual(saved.toolPins, { a: ["worktrees", "documents"], b: [] });
  assert.deepEqual(saved.pinnedWorkspaceIds, ["a", "closed"]);
  assert.deepEqual(parseSidebarPreferences(JSON.stringify(saved)), saved);
});

test("malformed preferences recover to defaults", () => {
  for (const raw of [null, "{", "null", '{"toolPins": {"a": ["invalid"]}, "pinnedWorkspaceIds": []}']) {
    assert.deepEqual(parseSidebarPreferences(raw), { sidebarMode: "threads", pinnedWorkspaceIds: [], toolPins: {}, threadGrouping: "none", workThreads: "visible", threadSourceFilter: "all", threadSort: "recent", workspaceAvatarColors: {}, workspaceViews: {} });
  }
});

test("thread grouping migrates existing preferences, persists choices and preserves pins on invalid grouping", () => {
  const legacy = { pinnedWorkspaceIds: ["a"], toolPins: { a: ["documents"] } };
  assert.deepEqual(parseSidebarPreferences(JSON.stringify(legacy)), { ...legacy, sidebarMode: "threads", threadGrouping: "none", workThreads: "visible", threadSourceFilter: "all", threadSort: "recent", workspaceAvatarColors: {}, workspaceViews: {} });
  for (const threadGrouping of ["none", "workspace", "activity", "source", "provider"]) {
    const saved = { ...legacy, sidebarMode: "bots", threadGrouping, workThreads: "hidden", threadSourceFilter: "all", threadSort: "recent", workspaceAvatarColors: {}, workspaceViews: {} };
    assert.deepEqual(parseSidebarPreferences(JSON.stringify(saved)), saved);
  }
  assert.equal(parseSidebarPreferences(JSON.stringify({ ...legacy, memberThreads: "hidden" })).workThreads, "hidden", "the older member-thread choice carries over");
  assert.deepEqual(parseSidebarPreferences(JSON.stringify({ ...legacy, threadGrouping: "invalid" })), { ...legacy, sidebarMode: "threads", threadGrouping: "none", workThreads: "visible", threadSourceFilter: "all", threadSort: "recent", workspaceAvatarColors: {}, workspaceViews: {} });
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
  assert.deepEqual(availableWorkspaceTools(true), ["worktrees", "merge-requests", "issues", "documents", "tasks", "terminals", "browser", "workflows"]);
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


test("MR navigation and pins persist for repositories and stay unavailable for plain folders", () => {
  const route = { projectId: "a", tool: "merge-requests" } as const;
  assert.equal(resolveWorkspaceToolRoute(route, "a", project), route);
  assert.equal(resolveWorkspaceToolRoute(route, "a", { ...project, versionControl: "none" }), null);
  assert.equal(resolveWorkspaceToolRoute(route, "b", project), null);
  const saved = parseSidebarPreferences(JSON.stringify({ pinnedWorkspaceIds: [], toolPins: { a: ["merge-requests"] }, workspaceViews: { a: { activeTool: "merge-requests" } } }));
  assert.deepEqual(saved.toolPins.a, ["merge-requests"]);
  assert.equal(saved.workspaceViews.a?.activeTool, "merge-requests");
  assert.deepEqual(parseSidebarPreferences(JSON.stringify(saved)), saved);
});

 test("issues tool routes and pins survive preference restoration", () => {
  const saved = parseSidebarPreferences(JSON.stringify({ pinnedWorkspaceIds: [], toolPins: { a: ["issues"] }, workspaceViews: { a: { activeTool: "issues" } } }));
  assert.deepEqual(saved.toolPins.a, ["issues"]);
  assert.equal(saved.workspaceViews.a?.activeTool, "issues");
  assert.ok(availableWorkspaceTools(true).includes("issues"));
  assert.ok(!availableWorkspaceTools(false).includes("issues"));
});
