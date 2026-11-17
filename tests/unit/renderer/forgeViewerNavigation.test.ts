import assert from "node:assert/strict";
import test from "node:test";
import { backFromForgeViewer } from "@/components/app/logic/forgeViewerNavigation";
import { createForgeViewerTab } from "@/components/app/logic/forgeViewerTabs";
import type { WorkspaceToolRoute } from "@/components/app/types/workspaceNavigation.types";

test("MR Back opens the owning workspace list and preserves its review tab", () => {
  const tab = createForgeViewerTab("workspace-a", "pull_request", 42, "Review navigation");
  const routes: WorkspaceToolRoute[] = [];
  const closed: string[] = [];
  backFromForgeViewer({ tab, openTool: (projectId, tool) => routes.push({ projectId, tool }), closeViewer: (id) => closed.push(id) });
  assert.deepEqual(routes, [{ projectId: "workspace-a", tool: "merge-requests" }]);
  assert.deepEqual(closed, []);
});

test("Back does not redirect workflow viewers into the MR list", () => {
  for (const kind of ["workflow_run"] as const) {
    const tab = createForgeViewerTab("workspace-b", kind, 17, "Other item");
    const closed: string[] = [];
    backFromForgeViewer({ tab, openTool: () => assert.fail("An unrelated viewer must not open the MR list"), closeViewer: (id) => closed.push(id) });
    assert.deepEqual(closed, [tab.id]);
  }
});

test("Back without a selected viewer leaves navigation unchanged", () => {
  backFromForgeViewer({ tab: null, openTool: () => assert.fail("No viewer is selected"), closeViewer: () => assert.fail("No tab should close") });
});

 test("issue Back opens the owning issues tool and preserves its tab", () => {
  const tab = createForgeViewerTab("workspace-a", "issue", 42, "Issue navigation");
  const routes: WorkspaceToolRoute[] = [];
  backFromForgeViewer({ tab, openTool: (projectId, tool) => routes.push({ projectId, tool }), closeViewer: () => assert.fail("Keep the issue tab") });
  assert.deepEqual(routes, [{ projectId: "workspace-a", tool: "issues" }]);
});
