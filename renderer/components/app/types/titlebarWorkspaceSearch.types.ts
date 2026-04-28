export type WorkspaceQuickSearchGroupId =
  | "agents"
  | "terminals"
  | "tasks"
  | "specs"
  | "notes"
  | "files";

export type WorkspaceQuickSearchPick =
  | { kind: "agent"; agentId: string }
  | { kind: "terminal"; terminalId: string }
  | { kind: "task"; projectId: string; path: string }
  | { kind: "spec"; projectId: string; path: string }
  | { kind: "note"; projectId: string; path: string }
  | { kind: "file"; path: string };

export type WorkspaceQuickSearchAgentSource = {
  id: string;
  name: string;
  task: string;
  toolLabel: string;
  workspace: string;
  projectId: string;
  branch: string;
  /** Resolved worktree checkout path for search (worktree label / folder). */
  worktreePath: string | null;
};

export type WorkspaceQuickSearchTerminalSource = {
  id: string;
  name: string;
  workspace: string;
  projectId: string;
  branch: string;
  worktreePath: string | null;
};

export type WorkspaceQuickSearchDocumentSource = {
  projectId: string;
  projectName: string;
  path: string;
  title: string;
};

export type WorkspaceQuickSearchSource = {
  agents: readonly WorkspaceQuickSearchAgentSource[];
  terminals: readonly WorkspaceQuickSearchTerminalSource[];
  tasks: readonly WorkspaceQuickSearchDocumentSource[];
  specs: readonly WorkspaceQuickSearchDocumentSource[];
  notes: readonly WorkspaceQuickSearchDocumentSource[];
  filePaths: readonly string[];
};

export type WorkspaceQuickSearchRow = {
  key: string;
  group: WorkspaceQuickSearchGroupId;
  title: string;
  subtitle: string | null;
  searchText: string;
  pick: WorkspaceQuickSearchPick;
};

export type TitleBarWorkspaceQuickSearchConfig = {
  source: WorkspaceQuickSearchSource;
  openRequestId: number;
  resolvedTheme: "light" | "dark";
  /** Pre-formatted shortcut for the palette trigger (e.g. ⌘K). */
  openShortcutLabel: string;
  onPick: (pick: WorkspaceQuickSearchPick) => void;
};
