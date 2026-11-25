import { getPathLeafName } from "@/components/app/logic/pathLeaf";
import type {
  WorkspaceQuickSearchGroupId,
  WorkspaceQuickSearchGroups,
  WorkspaceQuickSearchRow,
  WorkspaceQuickSearchSource
} from "@/components/app/types/titlebarWorkspaceSearch.types";

const GROUP_ORDER: WorkspaceQuickSearchGroupId[] = [
  "agents",
  "terminals",
  "tasks",
  "specs",
  "notes",
  "files"
];

const MAX_PER_GROUP = 25;

/** Shown when the palette opens with an empty query (Command palette browse mode). */
const BROWSE_MAX_PER_GROUP = 12;

const shouldSkipFilePath = (path: string): boolean => {
  const normalized = path.replace(/\\/g, "/").toLowerCase();
  return (
    normalized.includes("/node_modules/")
    || normalized.startsWith("node_modules/")
    || normalized.includes("/.git/")
    || normalized.startsWith(".git/")
  );
};

const normalizeTokens = (query: string): string[] =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

const matchesTokens = (haystack: string, tokens: string[]): boolean => {
  if (!tokens.length) {
    return false;
  }

  for (const token of tokens) {
    if (!haystack.includes(token)) {
      return false;
    }
  }

  return true;
};

const worktreeSearchFragments = (workspace: string, worktreePath: string | null): string[] => {
  const parts = [workspace, worktreePath ?? ""].filter(Boolean);
  if (worktreePath) {
    const base = getPathLeafName(worktreePath);
    if (base) {
      parts.push(base);
    }
  }

  const fromWorkspace = getPathLeafName(workspace);
  if (fromWorkspace && !parts.includes(fromWorkspace)) {
    parts.push(fromWorkspace);
  }

  return parts;
};

export const buildWorkspaceQuickSearchRows = (source: WorkspaceQuickSearchSource): WorkspaceQuickSearchGroups => {
  const rows: WorkspaceQuickSearchGroups = { agents: [], terminals: [], tasks: [], specs: [], notes: [], files: [] };

  for (const agent of source.agents) {
    const searchText = [
      agent.name,
      agent.task,
      agent.toolLabel,
      agent.branch,
      ...worktreeSearchFragments(agent.workspace, agent.worktreePath),
      agent.projectId
    ]
      .join(" ")
      .toLowerCase();

    const branchLabel = agent.branch.trim();
    const worktreeName = getPathLeafName(agent.worktreePath ?? "") || getPathLeafName(agent.workspace);
    const taskLine = agent.task.trim();
    const subtitleParts: string[] = [];
    if (worktreeName) {
      subtitleParts.push(worktreeName);
    }

    if (branchLabel) {
      subtitleParts.push(branchLabel);
    }

    if (taskLine) {
      subtitleParts.push(taskLine);
    }

    const subtitle = subtitleParts.length ? subtitleParts.join(" · ") : agent.toolLabel;

    rows.agents.push({
      key: `agent:${agent.id}`,
      group: "agents",
      title: agent.name,
      subtitle,
      searchText,
      pick: { kind: "agent", agentId: agent.id }
    });
  }

  for (const terminal of source.terminals) {
    const searchText = [
      terminal.name,
      terminal.branch,
      ...worktreeSearchFragments(terminal.workspace, terminal.worktreePath),
      terminal.projectId
    ]
      .join(" ")
      .toLowerCase();
    const terminalBranch = terminal.branch.trim();
    rows.terminals.push({
      key: `terminal:${terminal.id}`,
      group: "terminals",
      title: terminal.name,
      subtitle: terminalBranch ? `${terminalBranch} · ${terminal.workspace}` : terminal.workspace,
      searchText,
      pick: { kind: "terminal", terminalId: terminal.id }
    });
  }

  for (const task of source.tasks) {
    const searchText = [task.title, task.path, task.projectName, task.projectId].join(" ").toLowerCase();
    rows.tasks.push({
      key: `task:${task.projectId}:${task.path}`,
      group: "tasks",
      title: task.title,
      subtitle: task.projectName,
      searchText,
      pick: { kind: "task", projectId: task.projectId, path: task.path }
    });
  }

  for (const spec of source.specs) {
    const searchText = [spec.title, spec.path, spec.projectName, spec.projectId].join(" ").toLowerCase();
    rows.specs.push({
      key: `spec:${spec.projectId}:${spec.path}`,
      group: "specs",
      title: spec.title,
      subtitle: spec.projectName,
      searchText,
      pick: { kind: "spec", projectId: spec.projectId, path: spec.path }
    });
  }

  for (const note of source.notes) {
    const searchText = [note.title, note.path, note.projectName, note.projectId].join(" ").toLowerCase();
    rows.notes.push({
      key: `note:${note.projectId}:${note.path}`,
      group: "notes",
      title: note.title,
      subtitle: note.projectName,
      searchText,
      pick: { kind: "note", projectId: note.projectId, path: note.path }
    });
  }

  const sortedPaths = source.filePaths.filter((path) => !shouldSkipFilePath(path)).sort((left, right) =>
    left.localeCompare(right)
  );

  for (const path of sortedPaths) {
    const searchText = path.toLowerCase();
    rows.files.push({
      key: `file:${path}`,
      group: "files",
      title: path.split("/").pop() || path,
      subtitle: path.includes("/") ? path : null,
      searchText,
      pick: { kind: "file", path }
    });
  }

  return rows;
};

export function workspaceQuickSearchResults(groups: WorkspaceQuickSearchGroups, query: string): WorkspaceQuickSearchRow[] {
  const tokens = normalizeTokens(query);
  return GROUP_ORDER.flatMap((group) => {
    if (!tokens.length) return groups[group].slice(0, BROWSE_MAX_PER_GROUP);
    const matches: WorkspaceQuickSearchRow[] = [];
    for (const row of groups[group]) {
      if (matchesTokens(row.searchText, tokens)) matches.push(row);
      if (matches.length === MAX_PER_GROUP) break;
    }
    return matches;
  });
}
