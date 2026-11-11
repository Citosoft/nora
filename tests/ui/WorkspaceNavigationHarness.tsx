import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRootStateProvider, useAppRootState } from "@/components/app/context/appRootStateContext";
import { WorkspaceNavigationProvider } from "@/components/app/context/workspaceNavigationContext";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { appRootInitialUiState } from "@/components/app/logic/appRootInitialState";
import { appStateFromAppDomainState } from "@/components/app/logic/appStateFromAppDomainState";
import { getEmptyAppDomainState } from "@/components/app/logic/hydrateAppDomainState";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { ThreadWorkspaceComposition } from "@/components/app/views/ThreadWorkspaceComposition";
import { ThreadWorkspaceCenter } from "@/components/app/panels/threads/ThreadWorkspaceCenter";
import { SessionTabPane, SessionTabStack } from "@/components/app/panels/SessionTabStack";
import { WorkspaceToolHeader } from "@/components/app/panels/workspace-tools/WorkspaceToolHeader";
import type { ProjectSummary } from "@shared/appTypes";
import { threadWorkspaceFixture } from "../unit/renderer/threadWorkspaceFixtures";

const fixture = threadWorkspaceFixture();
const store = createThreadWorkspaceStore(fixture.deps);
store.focusWorkspace("project");
const draftId = store.openDraft({ workspaceId: "project" });
if (!draftId) throw new Error("Fixture draft could not be opened");
const documentId: string = draftId;
const project: ProjectSummary = { id: "shell", name: "Project", rootPath: "/project", gitCommonDir: "/project/.git", baseBranch: "main", versionControl: "git", framework: null, platform: "darwin", createdAt: "", updatedAt: "", lastOpenedAt: "" };
const snapshot = { ...appStateFromAppDomainState(getEmptyAppDomainState()), project };
let failStorage = false;
let writes = 0;
const setItem = Storage.prototype.setItem;
Storage.prototype.setItem = function(key, value) {
  if (failStorage) throw new Error("Storage unavailable");
  writes++;
  setItem.call(this, key, value);
};

function NavigationControls() {
  const navigation = useWorkspaceNavigation();
  const { snapshot: current, setUiState } = useAppRootState();
  return <main className="flex h-screen flex-col bg-background text-foreground">
    <nav className="flex gap-4 p-4">
      <button id="open-tool" onClick={() => navigation.openTool(current?.project?.id ?? "", "documents")}>Documents</button>
      <button id="thread" onClick={() => store.focusDocument(documentId)}>Thread</button>
      <button id="workspace" onClick={() => setUiState((state) => ({ ...state, snapshot: { ...snapshot, project: current?.project?.id === "shell" ? { ...project, id: "other" } : project } }))}>Switch workspace</button>
      <button id="pin" onClick={() => navigation.setPreferences((value) => ({ ...value, pinnedWorkspaceIds: [...value.pinnedWorkspaceIds, "shell"] }))}>Pin</button>
      <button id="storage-fail" onClick={() => { failStorage = true; }}>Fail storage</button>
      <button id="storage-recover" onClick={() => { failStorage = false; }}>Recover storage</button>
    </nav>
    <output id="navigation-state">{JSON.stringify({ route: navigation.route, preferences: navigation.preferences, error: navigation.preferenceError, writes })}</output>
    <SessionTabStack>
      <SessionTabPane visible={!navigation.route}><ThreadWorkspaceCenter /></SessionTabPane>
      {navigation.route && <SessionTabPane visible className="bg-background"><WorkspaceToolHeader title="Documents" workspaceName="Project" /><p>Workspace tool content</p></SessionTabPane>}
    </SessionTabStack>
  </main>;
}
const root = document.getElementById("app");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(<StrictMode><AppRootStateProvider initialUiState={{ ...appRootInitialUiState, snapshot }}><ThreadWorkspaceComposition store={store}><WorkspaceNavigationProvider><NavigationControls /></WorkspaceNavigationProvider></ThreadWorkspaceComposition></AppRootStateProvider></StrictMode>);
