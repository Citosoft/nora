import os from "node:os";
import path from "node:path";

export function getNoraRoot(): string {
  return path.join(os.homedir(), ".nora");
}

export function getConfigDir(): string {
  return path.join(getNoraRoot(), "config");
}

export function getStateDir(): string {
  return path.join(getNoraRoot(), "state");
}

export function getProjectsDir(): string {
  return path.join(getNoraRoot(), "projects");
}

export function getRemoteMountsDir(): string {
  return path.join(getNoraRoot(), "mounts");
}

export function getRecentProjectsPath(): string {
  return path.join(getStateDir(), "recent-projects.json");
}

export function getToolConfigPath(): string {
  return path.join(getConfigDir(), "tool-config.json");
}

export function getAppSettingsPath(): string {
  return path.join(getConfigDir(), "app-settings.json");
}

export function getProjectsIndexPath(): string {
  return path.join(getStateDir(), "projects.json");
}

export function getSessionsIndexPath(): string {
  return path.join(getStateDir(), "sessions.json");
}

export function getProjectDir(projectId: string): string {
  return path.join(getProjectsDir(), projectId);
}

export function getProjectFile(projectId: string): string {
  return path.join(getProjectDir(projectId), "project.json");
}

export function getWorkspaceSplitViewsPath(projectId: string): string {
  return path.join(getProjectDir(projectId), "split-views.json");
}

export function getSessionsDir(projectId: string): string {
  return path.join(getProjectDir(projectId), "sessions");
}

export function getSessionDir(projectId: string, sessionId: string): string {
  return path.join(getSessionsDir(projectId), sessionId);
}

export function getSessionFile(projectId: string, sessionId: string): string {
  return path.join(getSessionDir(projectId, sessionId), "session.json");
}

export function getWorktreesDir(projectId: string, sessionId: string): string {
  return path.join(getSessionDir(projectId, sessionId), "worktrees");
}

export function getWorktreeDir(projectId: string, sessionId: string, worktreeId: string): string {
  return path.join(getWorktreesDir(projectId, sessionId), worktreeId);
}

export function getWorktreeRepoDir(projectId: string, sessionId: string, worktreeId: string): string {
  return path.join(getWorktreeDir(projectId, sessionId, worktreeId), `checkout-${worktreeId.slice(0, 8)}`);
}

export function getWorktreeMetaPath(projectId: string, sessionId: string, worktreeId: string): string {
  return path.join(getWorktreeDir(projectId, sessionId, worktreeId), "meta.json");
}

export function getWorktreeContextPath(projectId: string, sessionId: string, worktreeId: string): string {
  return path.join(getWorktreeDir(projectId, sessionId, worktreeId), "context.md");
}

export function getAgentContextPath(projectId: string, sessionId: string, worktreeId: string, agentId: string): string {
  return path.join(getWorktreeDir(projectId, sessionId, worktreeId), `context-${agentId}.md`);
}

export function getWorktreeTerminalPath(projectId: string, sessionId: string, worktreeId: string): string {
  return path.join(getWorktreeDir(projectId, sessionId, worktreeId), "terminal.ansi");
}
