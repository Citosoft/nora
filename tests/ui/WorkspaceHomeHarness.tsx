import { createRoot } from "react-dom/client";
import { useState } from "react";
import { WorkspaceHome } from "@/components/app/panels/workspace-home/WorkspaceHome";
import { useWorkspaceHome } from "@/components/app/hooks/useWorkspaceHome";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { ThreadWorkspaceComposition } from "@/components/app/views/ThreadWorkspaceComposition";
import { WorkspaceNavigationContext } from "@/components/app/context/workspaceNavigationContext";
import { parseSidebarPreferences } from "@/components/app/logic/workspace-navigation/preferences";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { threadSummary, threadWorkspaceFixture } from "../unit/renderer/threadWorkspaceFixtures";
import type { WorkspaceToolRoute } from "@/components/app/types/workspaceNavigation.types";

const fixture = threadWorkspaceFixture();
const project = fixture.deps.boot.workspaces[1];
project.name = "Nora";
project.kind = "repository";
project.workspace.path = "/Users/daniel/dev/nora-oss";
fixture.summaries.splice(0, fixture.summaries.length, ...["Polish workspace navigation", "Improve the onboarding flow", "Explore the project structure"].map((title, index) => {
  const summary = threadSummary(`home-${index}`);
  summary.conversation.title = title;
  summary.conversation.workspace = project.workspace;
  if (index === 0) { summary.pendingRequestCount = 1; }
  return summary;
}));
const store = createThreadWorkspaceStore(fixture.deps);
store.focusWorkspace(project.id);

function HomePreview() {
  const home = useWorkspaceHome();
  const { state } = useThreadCenterPorts();
  return <><WorkspaceHome {...home} /><output id="home-state" className="sr-only">{JSON.stringify(state.layout)}</output></>;
}

function WorkspaceHomeHarness() {
  const [route, setRoute] = useState<WorkspaceToolRoute | null>(null);
  const [preferences, setPreferences] = useState(() => parseSidebarPreferences(null));
  return <ThreadWorkspaceComposition store={store}><WorkspaceNavigationContext.Provider value={{ route, openedTools: [], preferences, setPreferences, preferenceError: null,
    openTool: (projectId, tool) => setRoute({ projectId, tool }), closeTool: () => setRoute(null), returnToThread: () => setRoute(null) }}>
    <main className="flex h-screen flex-col bg-background text-foreground"><HomePreview /><output id="home-route" className="sr-only">{JSON.stringify(route)}</output></main>
  </WorkspaceNavigationContext.Provider></ThreadWorkspaceComposition>;
}
const root = document.getElementById("app");
if (!root) throw new Error("Home fixture root is missing");
createRoot(root).render(<WorkspaceHomeHarness />);
