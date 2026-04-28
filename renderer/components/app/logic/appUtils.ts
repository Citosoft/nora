import { canonicalizeAppStateFromMain } from "@/components/app/logic/canonicalizeAppState";
import type {
  AgentSession,
  AppState,
  AppStateDelta,
  ChangeEntry,
  ForgeWorkItemComment,
  ForgeWorkItemDetail,
  TerminalSession,
  VercelProjectSummary,
  WorkspaceSummary,
  WorktreeRecord
} from "@shared/appTypes";
import { isPathWithinComparableRoot, normalizeComparablePath } from "@shared/pathComparison";

export function isAbsolutePath(value: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\") || value.startsWith("/");
}

export function joinWorkspacePath(rootPath: string, relativePath: string): string {
  if (!rootPath) {
    return relativePath;
  }
  if (isAbsolutePath(relativePath)) {
    return relativePath;
  }

  const useWindowsSeparators = /^[A-Za-z]:[\\/]/.test(rootPath) || rootPath.startsWith("\\\\");
  const separator = useWindowsSeparators ? "\\" : "/";
  const normalizedRoot = rootPath.replace(/[\\/]+$/, "");
  const normalizedRelative = useWindowsSeparators
    ? relativePath.replace(/\//g, "\\").replace(/^[\\]+/, "")
    : relativePath.replace(/\\/g, "/").replace(/^\/+/, "");

  return `${normalizedRoot}${separator}${normalizedRelative}`;
}

export function formatTaskFileInstruction(taskPath: string): string {
  const label = taskPath.split(/[\\/]/).pop() || "task.md";
  const completionInstruction = formatTaskCompletionInstruction(taskPath);
  return [
    `Read the task details from [${label}](${taskPath}). Use that file as the source of truth, then start the task.`,
    completionInstruction
  ].filter(Boolean).join("\n\n");
}

export function resolveTaskInstructionPath(projectRootPath: string, taskPath: string): string {
  return joinWorkspacePath(projectRootPath, taskPath);
}

export function resolveCompletedTaskPath(taskPath: string): string {
  return replaceTaskPathSegment(taskPath, "/.nora/tasks/", "/.nora/tasks/completed/");
}

export function resolveIncompleteTaskPath(taskPath: string): string {
  return replaceTaskPathSegment(taskPath, "/.nora/tasks/completed/", "/.nora/tasks/");
}

export function resolveTaskCompletionTogglePath(taskPath: string, completed: boolean): string {
  return completed ? resolveIncompleteTaskPath(taskPath) : resolveCompletedTaskPath(taskPath);
}

function formatTaskCompletionInstruction(taskPath: string): string | null {
  const completedTaskPath = resolveCompletedTaskInstructionPath(taskPath);
  if (!completedTaskPath || completedTaskPath === taskPath) {
    return null;
  }

  return [
    "When you consider the task complete, mark it as completed by moving the task file.",
    `Current task file: ${taskPath}`,
    `Completed task file path: ${completedTaskPath}`,
    "Update the task file at that completed path as part of wrapping up the work."
  ].join("\n");
}

function resolveCompletedTaskInstructionPath(taskPath: string): string | null {
  const normalized = taskPath.replace(/\\/g, "/");
  if (!normalized.includes("/.nora/tasks/")) {
    return null;
  }
  if (normalized.includes("/.nora/tasks/completed/")) {
    return taskPath;
  }
  return resolveCompletedTaskPath(taskPath);
}

function replaceTaskPathSegment(taskPath: string, fromSegment: string, toSegment: string): string {
  const normalized = taskPath.replace(/\\/g, "/");
  const nextNormalized = normalized.includes(fromSegment)
    ? normalized.replace(fromSegment, toSegment)
    : normalized;
  return taskPath.includes("\\") ? nextNormalized.replace(/\//g, "\\") : nextNormalized;
}

export function summarizeForgeIssueComments(comments: ForgeWorkItemComment[]): string[] {
  const informativeComments = comments
    .map((comment) => ({
      author: comment.author || "Unknown",
      body: comment.body.trim().replace(/\s+/g, " "),
      createdAt: comment.createdAt
    }))
    .filter((comment) => comment.body.length >= 24)
    .filter((comment) => !/^\+1[.!]*$/i.test(comment.body))
    .filter((comment) => !/^same here[.!]*$/i.test(comment.body))
    .filter((comment) => !/^(thanks|thank you)[.!]*$/i.test(comment.body))
    .filter((comment) => !/\b(bot|pipeline|ci|build)\b/i.test(comment.body))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);

  return informativeComments.map((comment) => {
    const compactBody = comment.body.length > 220 ? `${comment.body.slice(0, 217)}...` : comment.body;
    return `- ${comment.author}: ${compactBody}`;
  });
}

export function formatForgeIssueInstruction(detail: ForgeWorkItemDetail): string {
  const commentSummary = summarizeForgeIssueComments(detail.comments);
  const summary = [
    `Fix this issue: #${detail.item.number} ${detail.item.title}`,
    "",
    `Source: ${detail.item.webUrl}`,
    detail.item.author ? `Opened by: ${detail.item.author}` : "",
    `Current state: ${detail.item.state}`,
    `Last updated: ${detail.item.updatedAt}`,
    detail.labels.length ? `Labels: ${detail.labels.join(", ")}` : "",
    "",
    "Issue description:",
    detail.body.trim() || "No description provided.",
    commentSummary.length ? "" : null,
    commentSummary.length ? "Recent discussion:" : null,
    ...commentSummary
  ].filter(Boolean).join("\n");

  return `${summary}\n\nReview the issue carefully, inspect the codebase, make the necessary fix, and validate the result before reporting back.`;
}

export function normalizeForgeCreatePullRequestError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unable to create pull request.";
  const withoutIpcPrefix = message.replace(/^Error invoking remote method 'app:create-forge-pull-request':\s*/i, "");
  const githubPrefix = "GitHub request failed: ";
  const gitlabPrefix = "GitLab request failed: ";
  const apiPayload =
    withoutIpcPrefix.startsWith(githubPrefix)
      ? withoutIpcPrefix.slice(githubPrefix.length)
      : withoutIpcPrefix.startsWith(gitlabPrefix)
        ? withoutIpcPrefix.slice(gitlabPrefix.length)
        : null;

  if (apiPayload) {
    try {
      const parsed = JSON.parse(apiPayload) as { message?: string; errors?: Array<{ message?: string }> };
      const specificMessages = Array.isArray(parsed.errors)
        ? parsed.errors.map((entry) => entry.message).filter((entry): entry is string => !!entry)
        : [];
      if (specificMessages.length) {
        return specificMessages.join(" ");
      }
      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      return withoutIpcPrefix;
    }
  }

  return withoutIpcPrefix;
}

function normalizeComparableRepoUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.trim().replace(/\.git$/i, "").replace(/\/+$/, "").toLowerCase();
}

export function findSuggestedVercelProject(
  projects: VercelProjectSummary[],
  workspaceName: string,
  repo:
    | {
        provider: "github" | "gitlab";
        owner: string;
        name: string;
        webUrl: string;
      }
    | null
): VercelProjectSummary | null {
  const scored = projects
    .map((project) => {
      let score = 0;

      if (repo) {
        const linkRepoUrl = normalizeComparableRepoUrl(project.link?.repoUrl);
        const repoUrl = normalizeComparableRepoUrl(repo.webUrl);
        if (linkRepoUrl && repoUrl && linkRepoUrl === repoUrl) {
          score += 100;
        }
        if (
          project.link?.type === repo.provider &&
          project.link?.org?.toLowerCase() === repo.owner.toLowerCase() &&
          project.link?.repo?.toLowerCase() === repo.name.toLowerCase()
        ) {
          score += 100;
        }
      }

      if (project.name.trim().toLowerCase() === workspaceName.trim().toLowerCase()) {
        score += 35;
      }

      return { project, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (!scored.length) {
    return null;
  }

  if (scored[0].score >= 100) {
    return scored[0].project;
  }

  if (scored[0].score >= 35 && (scored[1]?.score ?? 0) < scored[0].score) {
    return scored[0].project;
  }

  return null;
}

export function canAutoLinkVercelProject(
  project: VercelProjectSummary | null,
  repo:
    | {
        provider: "github" | "gitlab";
        owner: string;
        name: string;
        webUrl: string;
      }
    | null
): boolean {
  if (!project || !repo) {
    return false;
  }

  const linkRepoUrl = normalizeComparableRepoUrl(project.link?.repoUrl);
  const repoUrl = normalizeComparableRepoUrl(repo.webUrl);
  return (
    !!linkRepoUrl &&
    !!repoUrl &&
    linkRepoUrl === repoUrl
  ) || (
    project.link?.type === repo.provider &&
    project.link?.org?.toLowerCase() === repo.owner.toLowerCase() &&
    project.link?.repo?.toLowerCase() === repo.name.toLowerCase()
  );
}

export function getFocusedAgent(snapshot: AppState): AgentSession | null {
  return snapshot.agents.find((agent) => agent.id === snapshot.focusedAgentId) ?? null;
}

export function getFocusedTerminal(snapshot: AppState): TerminalSession | null {
  return snapshot.terminals.find((terminal) => terminal.id === snapshot.focusedTerminalId) ?? null;
}

export function getFocusedWorkspace(snapshot: AppState): WorkspaceSummary | null {
  if (!snapshot.project) {
    return snapshot.workspaces[0] ?? null;
  }

  return (
    snapshot.workspaces.find((workspace) => workspace.project.id === snapshot.project?.id) ?? {
      project: snapshot.project,
      sessions: snapshot.sessions,
      worktrees: snapshot.worktrees,
      agents: snapshot.agents,
      terminals: snapshot.terminals
    }
  );
}

export function getWorkspaceSwitcherEntries(snapshot: AppState): WorkspaceSummary[] {
  const currentWorkspaceSummary =
    snapshot.project
      ? {
          project: snapshot.project,
          sessions: snapshot.sessions,
          worktrees: snapshot.worktrees,
          agents: snapshot.agents,
          terminals: snapshot.terminals
        } satisfies WorkspaceSummary
      : null;

  return [
    ...(currentWorkspaceSummary &&
    !snapshot.workspaces.some((workspace) => workspace.project.id === currentWorkspaceSummary.project.id)
      ? [currentWorkspaceSummary]
      : []),
    ...snapshot.workspaces
  ].map((workspace) =>
    currentWorkspaceSummary && workspace.project.id === currentWorkspaceSummary.project.id
      ? currentWorkspaceSummary
      : workspace
  );
}

export function getActiveWorktree(snapshot: AppState): WorktreeRecord | null {
  const focusedAgent = getFocusedAgent(snapshot);
  if (focusedAgent) {
    return snapshot.worktrees.find((worktree) => worktree.id === focusedAgent.worktreeId) ?? null;
  }

  const focusedTerminal = getFocusedTerminal(snapshot);
  if (focusedTerminal) {
    return snapshot.worktrees.find((worktree) => worktree.id === focusedTerminal.worktreeId) ?? null;
  }

  const currentSession = snapshot.sessions.find((session) => session.id === snapshot.currentSessionId) ?? null;
  return snapshot.worktrees.find((worktree) => worktree.id === currentSession?.focusedWorktreeId) ?? null;
}

export function getSelectedChange(snapshot: AppState): ChangeEntry | null {
  return snapshot.changes.find((change) => change.path === snapshot.selectedChangePath) ?? snapshot.changes[0] ?? null;
}

function normalizeWindowsPath(value: string): string {
  return normalizeComparablePath(value, { windows: true });
}

export function normalizeSnapshot(snapshot: AppState): AppState {
  return canonicalizeAppStateFromMain(snapshot);
}

export function applyStateDelta(snapshot: AppState, delta: AppStateDelta): AppState | null {
  const nextAgentsById = new Map(delta.changedAgents.map((agent) => [agent.id, agent]));
  const nextTerminalsById = new Map(delta.changedTerminals.map((terminal) => [terminal.id, terminal]));

  if ([...nextAgentsById.keys()].some((id) => !snapshot.agents.some((agent) => agent.id === id))) {
    return null;
  }
  if ([...nextTerminalsById.keys()].some((id) => !snapshot.terminals.some((terminal) => terminal.id === id))) {
    return null;
  }

  const agents = snapshot.agents.map((agent) => nextAgentsById.get(agent.id) || agent);
  const terminals = snapshot.terminals.map((terminal) => nextTerminalsById.get(terminal.id) || terminal);
  const workspaces = snapshot.workspaces.map((workspace) => ({
    ...workspace,
    agents: workspace.agents.map((agent) => nextAgentsById.get(agent.id) || agent),
    terminals: workspace.terminals.map((terminal) => nextTerminalsById.get(terminal.id) || terminal)
  }));

  return {
    ...snapshot,
    agents,
    terminals,
    workspaces,
    focusedAgentId: delta.focusedAgentId,
    focusedTerminalId: delta.focusedTerminalId,
    errorMessage: delta.errorMessage
  };
}

export function isRemoteMountedProject(snapshot: AppState | null): boolean {
  if (!snapshot?.project) {
    return false;
  }

  const projectPath = normalizeWindowsPath(snapshot.project.rootPath);
  return snapshot.activeRemoteMounts.some((mount) => {
    if (!mount.localMount) {
      return false;
    }
    return isPathWithinComparableRoot(projectPath, mount.localMount, { windows: true });
  });
}

export function shouldPromptToRemoveMissingWorkspace(error: unknown): error is Error {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("unable to open the selected git repository") ||
    message.includes("selected folder is not a git repository")
  );
}
