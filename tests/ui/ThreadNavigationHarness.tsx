import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { AppRootStateProvider } from "@/components/app/context/appRootStateContext";
import { WorkspaceNavigationProvider } from "@/components/app/context/workspaceNavigationContext";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { noraLoopClient } from "@/components/app/clients/noraLoopClient";
import { appRootInitialUiState } from "@/components/app/logic/appRootInitialState";
import { appStateFromAppDomainState } from "@/components/app/logic/appStateFromAppDomainState";
import { getEmptyAppDomainState } from "@/components/app/logic/hydrateAppDomainState";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { ThreadNavigation } from "@/components/app/panels/threads/ThreadNavigation";
import { WorkspaceSwitcher } from "@/components/app/sidebar/workspace-navigation/WorkspaceSwitcher";
import { ThreadWorkspaceComposition } from "@/components/app/views/ThreadWorkspaceComposition";
import { Input } from "@/components/ui/input";
import type { ProjectSummary, WorkspaceSummary } from "@shared/appTypes";
import type { ThreadRunState } from "@/components/app/types/thread-workspace/ports.types";
import { pickerCatalog } from "../unit/renderer/modelPickerFixtures";
import { threadSummary, threadWorkspaceFixture } from "../unit/renderer/threadWorkspaceFixtures";

const fixture = threadWorkspaceFixture();
const project = { ...fixture.deps.boot.workspaces[1], name: "Nora Desktop" };
const website = { ...project, id: "website", name: "Marketing Site", shellProjectId: "shell-website", workspace: { ...project.workspace, projectId: "website", path: "/website" } };
fixture.deps.boot = { ...fixture.deps.boot, workspaces: [fixture.deps.boot.workspaces[0], project, website] };
fixture.summaries.splice(0);
function addThread(id: string, title: string, workspaceId: string, state?: ThreadRunState) {
  const summary = threadSummary(id);
  const workspace = fixture.deps.boot.workspaces.find((entry) => entry.id === workspaceId);
  if (!workspace) throw new Error("Missing fixture workspace");
  summary.conversation = { ...summary.conversation, title, workspace: workspace.workspace };
  if (state) summary.latestRun = { id: `run-${id}`, state, createdAt: fixture.deps.now(), updatedAt: fixture.deps.now(), failure: null };
  if (state === "awaiting-approval") summary.pendingRequestCount = 1;
  fixture.summaries.push(summary);
}
addThread("pinned", "Plan the week", "personal");
addThread("nora", "Polish the workspace sidebar", "project", "running");
addThread("nora-old", "Review the release notes", "project", "completed");
addThread("website", "Update the homepage", "website", "awaiting-approval");
addThread("website-old", "Improve the pricing page", "website", "completed");
addThread("personal", "Collect design references", "personal");
let showExternal = false;
const externalSessions = [
  { origin: "cli" as const, id: "codex-cli", title: "Fix the terminal regression", providerKind: "codex" as const, instanceId: "account", cwd: "/project", createdAt: fixture.deps.now(), updatedAt: fixture.deps.now() },
  { origin: "cli" as const, id: "claude-cli", title: "Continue the Claude investigation", providerKind: "claude" as const, instanceId: "account", cwd: "/project", createdAt: fixture.deps.now(), updatedAt: fixture.deps.now() }
];
fixture.deps.client.externalSessions = async (kind, _instance, workspace) => ({ status: "available", sessions: showExternal && workspace.projectId === "project" ? externalSessions.filter((session) => session.providerKind === kind) : [] });
const originalExecute = fixture.deps.client.execute;
fixture.deps.client.execute = async (command) => {
  const receipt = await originalExecute(command);
  if (command.kind === "create" && command.externalSessionId) {
    const summary = fixture.summaries.find((entry) => entry.conversation.id === receipt.conversationId);
    if (summary) summary.conversation = { ...summary.conversation, nativeConversationId: command.externalSessionId, origin: "cli" };
  }
  return receipt;
};
fixture.deps.client.catalog = async (kind, instanceId) => pickerCatalog({ kind, instanceId, label: kind });
const store = createThreadWorkspaceStore(fixture.deps);
store.focusWorkspace("project");
store.togglePin("pinned");
store.openDraft({ workspaceId: "project" });
noraLoopClient.onLoopRunChanged = () => () => {};
noraLoopClient.listLoopRuns = async () => [];
const shellProject: ProjectSummary = { id: "shell", name: project.name, rootPath: "/project", gitCommonDir: "/project/.git", baseBranch: "main", versionControl: "git", framework: null, platform: "linux", createdAt: "", updatedAt: "", lastOpenedAt: "" };
const workspaces: WorkspaceSummary[] = [shellProject, { ...shellProject, id: "shell-website", name: website.name, rootPath: "/website" }]
  .map((entry) => ({ project: entry, sessions: [], worktrees: [], agents: [], terminals: [] }));
const snapshot = { ...appStateFromAppDomainState(getEmptyAppDomainState()), project: shellProject };

function SidebarPreview() {
  const navigation = useWorkspaceNavigation();
  const { state } = useThreadNavigationPorts();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("shell");
  return <main className="flex h-screen bg-background text-foreground">
    <aside id="thread-sidebar" className="workspace-shell-surface flex w-64 shrink-0 flex-col border-r">
      <div className="flex px-3 pt-3"><WorkspaceSwitcher workspaces={workspaces} activeId={activeId} collapsed={false} recentWorkspaces={[]}
        onSelect={(id) => { setActiveId(id); store.focusWorkspace(id === "shell" ? "project" : "website"); }} onOpenRecent={() => {}} onAdd={() => {}} /></div>
      <div className="px-4 py-3"><Input aria-label="Search threads" placeholder="Search threads…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <ThreadNavigation unified query={query} sort={navigation.preferences.threadSort}
        onSortChange={(threadSort) => navigation.setPreferences((current) => ({ ...current, threadSort }))} sourceFilter={navigation.preferences.threadSourceFilter}
        onSourceFilterChange={(threadSourceFilter) => navigation.setPreferences((current) => ({ ...current, threadSourceFilter }))} grouping={navigation.preferences.threadGrouping}
        onGroupingChange={(threadGrouping) => navigation.setPreferences((current) => ({ ...current, threadGrouping }))} />
    </aside>
    <div className="flex-1 p-10"><h1 className="text-xl font-semibold">Workspace threads</h1><p className="mt-2 text-sm text-muted-foreground">Find a thread across your workspaces.</p><button id="load-external" onClick={() => { showExternal = true; store.updateBoot({ ...store.snapshot().boot, providers: [...fixture.deps.boot.providers, { kind: "claude", instanceId: "account", label: "Claude" }] }); }}>Load external conversations</button><output id="navigation-state" className="sr-only">{JSON.stringify({ grouping: navigation.preferences.threadGrouping, activeId: state.layout.activeId, commands: fixture.commands.map((command) => command.kind) })}</output></div>
  </main>;
}
const root = document.getElementById("app");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(<StrictMode><AppRootStateProvider initialUiState={{ ...appRootInitialUiState, snapshot }}><ThreadWorkspaceComposition store={store}><WorkspaceNavigationProvider><SidebarPreview /></WorkspaceNavigationProvider></ThreadWorkspaceComposition></AppRootStateProvider></StrictMode>);
