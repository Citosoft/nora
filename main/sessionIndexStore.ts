import type { TerminalSession, WorktreeRecord } from "@shared/appTypes";
import fs from "node:fs/promises";
import path from "node:path";
import type { PersistedSessionState, SessionIndexEntry } from "./types/internal.types";

export class SessionIndexStore {
  constructor(
    private readonly indexPath: string,
    private readonly getSessionFilePath: (projectId: string, sessionId: string) => string
  ) {}

  async list(projectId?: string): Promise<SessionIndexEntry[]> {
    try {
      const raw = await fs.readFile(this.indexPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      const entries = Array.isArray(parsed) ? parsed.filter(isSessionIndexEntry) : [];
      return projectId ? entries.filter((entry) => entry.projectId === projectId) : entries;
    } catch {
      return [];
    }
  }

  async loadState(projectId: string, sessionId: string): Promise<PersistedSessionState | null> {
    try {
      const raw = await fs.readFile(this.getSessionFilePath(projectId, sessionId), "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return normalizePersistedSessionState(parsed);
    } catch {
      return null;
    }
  }

  async loadStatesForProject(projectId: string): Promise<PersistedSessionState[]> {
    const entries = await this.list(projectId);
    const states = await Promise.all(entries.map((entry) => this.loadState(entry.projectId, entry.sessionId)));
    return states.filter((state): state is PersistedSessionState => state !== null);
  }

  async saveState(state: PersistedSessionState): Promise<void> {
    const sessionFile = this.getSessionFilePath(state.projectId, state.session.id);
    await fs.mkdir(path.dirname(sessionFile), { recursive: true });
    await fs.writeFile(sessionFile, JSON.stringify(state, null, 2), "utf8");

    const existing = await this.list();
    const nextEntry: SessionIndexEntry = {
      sessionId: state.session.id,
      projectId: state.projectId,
      name: state.session.name,
      status: state.session.status,
      updatedAt: state.session.updatedAt,
      lastUsedAt: state.session.lastUsedAt
    };
    const next = [nextEntry, ...existing.filter((entry) => entry.sessionId !== state.session.id)];
    await fs.mkdir(path.dirname(this.indexPath), { recursive: true });
    await fs.writeFile(this.indexPath, JSON.stringify(next, null, 2), "utf8");
  }

  async removeProject(projectId: string): Promise<void> {
    const existing = await this.list();
    const remaining = existing.filter((entry) => entry.projectId !== projectId);
    await fs.mkdir(path.dirname(this.indexPath), { recursive: true });
    await fs.writeFile(this.indexPath, JSON.stringify(remaining, null, 2), "utf8");

    const sessionIds = existing
      .filter((entry) => entry.projectId === projectId)
      .map((entry) => entry.sessionId);
    await Promise.all(
      sessionIds.map((sessionId) =>
        fs.rm(path.dirname(this.getSessionFilePath(projectId, sessionId)), {
          recursive: true,
          force: true
        }).catch(() => {})
      )
    );
  }
}

export type { PersistedSessionState } from "./types/internal.types";

function isSessionIndexEntry(value: unknown): value is SessionIndexEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SessionIndexEntry>;
  return (
    typeof candidate.sessionId === "string" &&
    typeof candidate.projectId === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.lastUsedAt === "string"
  );
}

function normalizePersistedSessionState(value: unknown): PersistedSessionState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<PersistedSessionState> & {
    terminals?: unknown;
    focusedTerminalId?: unknown;
  };
  if (!candidate.session || typeof candidate.projectId !== "string" || !Array.isArray(candidate.agents) || !Array.isArray(candidate.worktrees)) {
    return null;
  }

  return {
    session: candidate.session,
    projectId: candidate.projectId,
    focusedAgentId: typeof candidate.focusedAgentId === "string" ? candidate.focusedAgentId : null,
    focusedTerminalId: typeof candidate.focusedTerminalId === "string" ? candidate.focusedTerminalId : null,
    selectedChangePath: typeof candidate.selectedChangePath === "string" ? candidate.selectedChangePath : null,
    selectedCommitHash: typeof (candidate as PersistedSessionState).selectedCommitHash === "string"
      ? (candidate as PersistedSessionState).selectedCommitHash
      : null,
    agents: candidate.agents,
    terminals: Array.isArray(candidate.terminals)
      ? candidate.terminals.map((terminal) => ({
          ...(terminal as TerminalSession),
          detectedLocalUrl:
            typeof (terminal as TerminalSession).detectedLocalUrl === "string"
              ? (terminal as TerminalSession).detectedLocalUrl
              : null,
          detectedLocalPort:
            typeof (terminal as TerminalSession).detectedLocalPort === "number"
              ? (terminal as TerminalSession).detectedLocalPort
              : null
        }))
      : [],
    worktrees: candidate.worktrees.map((worktree) => ({
      ...worktree,
      terminalSessionIds: Array.isArray((worktree as WorktreeRecord).terminalSessionIds)
        ? (worktree as WorktreeRecord).terminalSessionIds
        : [],
      scripts: Array.isArray((worktree as WorktreeRecord).scripts)
        ? (worktree as WorktreeRecord).scripts
        : []
    }))
  };
}
