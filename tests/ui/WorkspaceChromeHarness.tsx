import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AppRootStateProvider } from "@/components/app/context/appRootStateContext";
import { appRootInitialUiState } from "@/components/app/logic/appRootInitialState";
import { AppMainChromeShell } from "@/components/app/views/AppMainChromeShell";
import { TitleBar } from "@/components/app/chrome/TitleBar";
import { WorkspaceUtilitiesView } from "@/components/app/sidebar/WorkspaceUtilities";
import { ThreadInsightsPanel } from "@/components/app/panels/conversations/ThreadInsightsPanel";
import { useThreadInsights } from "@/components/app/hooks/useThreadInsights";
import { Textarea } from "@/components/ui/textarea";
import type { AppToolsProps } from "@/components/app/types/workspaceUtilities.types";
import type { TitleBarProps } from "@/components/app/types/chromeDialog.types";
import type { AgentCatalogEntry, ForgeBranchChanges, ForgeBranchPullRequestStatus } from "@shared/appTypes";
import type { ThreadForgeClient } from "@/components/app/types/threadForge.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ConversationHeader } from "@shared/types/conversation/queries.types";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import { threadSummary } from "../unit/renderer/threadWorkspaceFixtures";

const tool: AgentCatalogEntry = {
  id: "codex", label: "Codex", aliases: ["codex"], launchCommand: "codex", installTemplate: "", description: "", usageNotes: [], authFields: [],
  supportsUsageStatus: true, supportsAccountSwitch: true, usageDashboardUrl: "https://example.com/usage", detected: true, enabled: true,
  detectedCommand: "codex", detectedPath: "/fixture/codex", detectionProbe: null, detectionStdout: null, detectionStderr: null,
  installStatus: "idle", installLog: [], config: { values: {}, updatedAt: null }
};
const workspace: NativeWorkspace = { id: "repo", shellProjectId: "shell-repo", kind: "repository", name: "Nora", workspace: {
  projectId: "native-repo", environmentId: "local", checkoutId: "checkout", path: "/fixture/nora", branch: "feat/workspace-chrome", versionControl: "git", access: "write"
} };
const header: ConversationHeader = { schemaVersion: 1, cursor: 1, activeRuns: [], queuedRuns: [], pendingRequests: [],
  conversation: { ...threadSummary().conversation, id: "fixture-thread", title: "Simplify the workspace chrome", workspace: workspace.workspace } };
const items: TimelineItem[] = [{ kind: "review", id: "review", runId: "run", createdAt: "2026-11-10T10:00:00.000Z", result: {
  status: "ready", scope: "turn", attribution: "observed", baselineAt: "2026-11-10T09:00:00.000Z", capturedAt: "2026-11-10T10:00:00.000Z",
  changes: [{ path: "app.ts", kind: "modified", beforeMode: "100644", afterMode: "100644", beforeHash: null, afterHash: null,
    presentation: "text", patch: "diff --git a/app.ts b/app.ts\n--- a/app.ts\n+++ b/app.ts\n@@ -1 +1,2 @@\n-old\n+new\n+added\n" }]
} }];

/** Isolated chrome acceptance: no real workspaces, providers, credentials, or remote requests. */
export function WorkspaceChromeHarness() {
  const [collapsed, setCollapsed] = useState(false);
  const [settings, setSettings] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [events, setEvents] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [archived, setArchived] = useState(false);
  const scenario = useRef("ready");
  const record = useCallback((event: string) => setEvents((current) => [...current, event]), []);
  const forge = useMemo<ThreadForgeClient>(() => ({
    connections: { github: true, gitlab: false },
    readBranchRequest: async (projectId, branch): Promise<ForgeBranchPullRequestStatus | null> => {
      record(`branch:${projectId}:${branch}`);
      if (scenario.current === "failed") throw new Error("Could not load this branch's change request.");
      return scenario.current === "none" ? null : { branch, branchExistsOnRemote: true, state: "open", label: "Open", pullRequestNumber: 42, webUrl: "https://example.com/nora/pull/42" };
    },
    readBranchChanges: async (_projectId, _checkoutPath): Promise<ForgeBranchChanges | null> => ({ branch: workspace.workspace.branch, baseBranch: "main", provider: "github",
      files: 3, additions: 42, deletions: 7, partial: false, commitsAhead: 2, uncommittedFiles: 1, branches: [workspace.workspace.branch, "main"] }),
    readBranchDiff: async () => [],
    createChangeRequest: async () => { record("create-pr"); throw new Error("Fixture cannot create pull requests."); }
  }), [record]);
  const insights = useThreadInsights({ header, items, workspace, hasOlderHistory: false, forge });
  const appTools: AppToolsProps = {
    resolvedTheme: theme, settingsActive: settings,
    onToggleTheme: () => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); document.documentElement.dataset.theme = next; document.documentElement.classList.toggle("dark", next === "dark"); },
    onOpenSettings: () => setSettings((current) => !current), onOpenKeyboardShortcuts: () => record("shortcuts"), onOpenAbout: () => record("about"),
    onSubmitIssue: () => record("issue"), onOpenStartupDependencies: () => record("dependencies"), onOpenResourceMonitor: () => record("resources"), onOpenOnboarding: () => record("onboarding"), onOpenHomeTerminal: () => record("home-terminal"), onOpenConnectionsSettings: () => record("connections")
  };
  const title: TitleBarProps = { ...appTools, settingsActive: settings, themeMode: "system", windowUiState: { platform: "linux", isMaximized: false }, useMacTitleBarChrome: false,
    canOpenProjectInIde: false, installedIdes: [], isLoadingInstalledIdes: false, preferredIde: null, defaultIdeId: null, onOpenProjectInIde: () => {},
    isWorkspaceSidebarCollapsed: collapsed, sidebarsSwapped: false, onToggleWorkspaceSidebar: () => setCollapsed((current) => !current), onAddWorkspace: () => {}, onAddRemoteWorkspace: () => {},
    onCloseWorkspace: () => {}, onRefreshWorkspace: () => {}, onCreateTerminal: () => {}, onCreateAgent: () => {}, onCreateBrowser: () => {}, recentWorkspaces: [], onOpenRecentWorkspace: () => {},
    hasActiveWorkspace: true, isChangesSidebarCollapsed: true, onToggleChangesSidebar: () => {}, onToggleLocalTerminalDock: () => {}, onFocusLocalTerminalDock: () => {}, onFocusPreviousSessionTab: () => {}, onFocusNextSessionTab: () => {}
  };
  const status = useMemo(() => ({ entries: [{ id: 1, message: "Checking workspace", loading: true }], tools: [tool], activeWorkspaceBranch: "feat/workspace-chrome", activeWorkspaceWorktreeName: "nora",
    onInstallTool: async () => { record("install"); }, onSwitchToolAccount: async () => { record("account"); } }), [record]);
  return <AppRootStateProvider initialUiState={appRootInitialUiState}>
    <AppMainChromeShell titleBar={<TitleBar {...title} />} topBanners={null} mainScrollChildren={<div className="flex h-full min-h-0">
      <aside aria-label="Projects sidebar" style={{ width: collapsed ? 64 : 240 }} className="flex min-h-0 shrink-0 flex-col border-r bg-card">
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 text-xs text-muted-foreground">{!collapsed && "Projects and threads"}</div>
        <WorkspaceUtilitiesView collapsed={collapsed} status={status} appTools={appTools} />
      </aside>
      <main className="thread-conversation flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <>
          <div className="relative flex min-h-0 flex-1 flex-col" data-thread-insights={expanded ? "expanded" : "collapsed"}>
            <ThreadInsightsPanel header={{ ...header, conversation: { ...header.conversation, archivedAt: archived ? "2026-11-10T10:00:00.000Z" : null } }} providerLabel="Codex" connectors={null} skills={null} subagents={insights.subagents} changes={insights.changes} branch={insights.branch} expanded={expanded} busy={false} canSettle={!archived} hasOlderHistory={false}
              onToggle={() => setExpanded((current) => !current)} onLoadHistory={() => {}} onSettleChange={() => { setArchived(true); record("archive"); }} />
            <div className="thread-transcript min-h-0 flex-1 overflow-auto px-5 py-7"><p>Workspace controls are grouped in the sidebar. This conversation keeps its own change summary and branch request.</p></div>
          </div>
          <div className="m-4 rounded-2xl border bg-card p-3"><Textarea aria-label="Fixture message" variant="embedded" placeholder="Ask, plan, or start something…" /></div>
        </>
      </main>
      <output id="chrome-events" className="sr-only">{JSON.stringify(events)}</output>
      <select id="request-scenario" aria-label="Request scenario" className="sr-only" defaultValue="ready" onChange={(event) => { scenario.current = event.target.value; }}><option>ready</option><option>none</option><option>failed</option></select>
    </div>} />
    <Dialog.Root open={settings} onOpenChange={setSettings}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[8999] bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[9000] w-96 -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6">
          <Dialog.Title>Settings</Dialog.Title><Dialog.Description>Settings acceptance overlay</Dialog.Description>
          <Dialog.Close aria-label="Close settings">Close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </AppRootStateProvider>;
}
document.documentElement.dataset.theme = "dark";
document.documentElement.classList.add("dark");
const root = document.getElementById("app");
if (!root) throw new Error("Chrome acceptance root is missing");
createRoot(root).render(<WorkspaceChromeHarness />);
