import { listAvailableChangesPanelTabs, resolveAvailableChangesPanelTab } from "@/components/app/logic/changesPanelTabs";
import type { ProjectSummary } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createProject(versionControl: ProjectSummary["versionControl"]): ProjectSummary {
  return {
    id: "project-1",
    name: "Project",
    rootPath: "/project",
    versionControl,
    gitCommonDir: "",
    baseBranch: "",
    framework: null,
    platform: "darwin",
    createdAt: "2026-10-08T00:00:00.000Z",
    updatedAt: "2026-10-08T00:00:00.000Z",
    lastOpenedAt: "2026-10-08T00:00:00.000Z"
  };
}

test("listAvailableChangesPanelTabs hides git-only tabs for plain folders", () => {
  assert.deepEqual(listAvailableChangesPanelTabs(createProject("none")), ["files", "context"]);
  assert.deepEqual(listAvailableChangesPanelTabs(createProject("git")), ["git", "files", "context", "vercel", "forge"]);
  assert.deepEqual(listAvailableChangesPanelTabs(null), ["git", "files", "context", "vercel", "forge"]);
});

test("resolveAvailableChangesPanelTab falls back to Files for a hidden remembered tab", () => {
  const plainTabs = listAvailableChangesPanelTabs(createProject("none"));
  assert.equal(resolveAvailableChangesPanelTab("vercel", plainTabs), "files");
  assert.equal(resolveAvailableChangesPanelTab("context", plainTabs), "context");
});
