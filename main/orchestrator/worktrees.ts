import type {
  ActiveRemoteMount,
  AgentSession,
  CreateAgentPayload,
  ProjectSummary,
  SessionRecord,
  TerminalSession,
  WorkspaceSummary,
  WorktreeRecord
} from "@shared/appTypes";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getWorktreeDir, getWorktreeMetaPath, getWorktreeRepoDir } from "../noraPaths";
import type { PersistedSessionState, WorkspaceTarget } from "../types/internal.types";

type WorktreeHelperDeps = {
  nowIso: () => string;
  slugify: (value: string) => string;
  execGit: (target: WorkspaceTarget, args: string[], maxBuffer?: number) => Promise<{ stdout: string; stderr: string }>;
  detectWorkspaceScripts: (target: WorkspaceTarget) => Promise<WorktreeRecord["scripts"]>;
  readCurrentBranch: (target: WorkspaceTarget) => Promise<string>;
  getProjectTarget: (project: ProjectSummary) => WorkspaceTarget;
  getWorktreeTarget: (project: ProjectSummary, worktree: Pick<WorktreeRecord, "path" | "location">) => WorkspaceTarget;
  findRemoteMountForPath: (projectPath: string, mounts: ActiveRemoteMount[]) => ActiveRemoteMount | null;
  getActiveRemoteMounts: () => ActiveRemoteMount[];
  sessionIndexSaveState: (state: PersistedSessionState) => Promise<void>;
  isWindowsUncPath: (value: string) => boolean;
};

export function createWorktreeHelpers(deps: WorktreeHelperDeps) {
  async function createInitialSessionState(project: ProjectSummary): Promise<PersistedSessionState> {
    const session: SessionRecord = {
      id: randomUUID(),
      projectId: project.id,
      name: "Default Session",
      status: "active",
      createdAt: deps.nowIso(),
      updatedAt: deps.nowIso(),
      lastUsedAt: deps.nowIso(),
      focusedWorktreeId: null
    };
    const persisted: PersistedSessionState = {
      projectId: project.id,
      session,
      focusedAgentId: null,
      focusedTerminalId: null,
      selectedChangePath: null,
      selectedCommitHash: null,
      agents: [],
      terminals: [],
      worktrees: []
    };
    await deps.sessionIndexSaveState(persisted);
    return persisted;
  }

  function upsertSession(sessions: SessionRecord[], session: SessionRecord): SessionRecord[] {
    return [session, ...sessions.filter((item) => item.id !== session.id)];
  }

  function upsertWorktree(worktrees: WorktreeRecord[], worktree: WorktreeRecord): WorktreeRecord[] {
    return [worktree, ...worktrees.filter((item) => item.id !== worktree.id)];
  }

  function upsertWorkspaceSummary(workspaces: WorkspaceSummary[], workspace: WorkspaceSummary): WorkspaceSummary[] {
    return [workspace, ...workspaces.filter((item) => item.project.id !== workspace.project.id)];
  }

  async function getOrCreateRootWorktree(
    project: ProjectSummary,
    session: SessionRecord,
    existingWorktrees: WorktreeRecord[]
  ): Promise<WorktreeRecord> {
    const actualBranch = await deps.readCurrentBranch(deps.getProjectTarget(project)).catch(() => project.baseBranch);
    const existing = existingWorktrees.find((item) =>
      item.projectId === project.id &&
      item.sessionId === session.id &&
      item.path === project.rootPath
    );
    if (existing) {
      if (existing.branch === actualBranch) {
        return existing;
      }

      const next: WorktreeRecord = {
        ...existing,
        branch: actualBranch,
        updatedAt: deps.nowIso(),
        lastUsedAt: deps.nowIso()
      };
      await writeWorktreeMetadata(next);
      return next;
    }

    const worktree: WorktreeRecord = {
      id: randomUUID(),
      projectId: project.id,
      sessionId: session.id,
      path: project.rootPath,
      location: project.location,
      branch: actualBranch,
      createdFromRef: "ROOT",
      createdAt: deps.nowIso(),
      updatedAt: deps.nowIso(),
      lastUsedAt: deps.nowIso(),
      status: "ready",
      writerAgentId: null,
      readerAgentIds: [],
      terminalSessionIds: [],
      scripts: await deps.detectWorkspaceScripts(deps.getProjectTarget(project))
    };
    await writeWorktreeMetadata(worktree);
    return worktree;
  }

  function planManagedWorktree(
    project: ProjectSummary,
    session: SessionRecord,
    agentName: string,
    worktreeBranch?: CreateAgentPayload["worktreeBranch"],
    worktreeId = randomUUID()
  ): WorktreeRecord {
    const branchNameInput = worktreeBranch?.name.trim();
    const slug = deps.slugify(branchNameInput || agentName) || "agent";
    const branch = branchNameInput
      ? `${(worktreeBranch?.prefix.trim() || "feature")}/${slug}`
      : `nora/${session.id.slice(0, 8)}/${slug}-${Date.now().toString(36)}`;
    const remoteMount = project.location?.kind === "ssh"
      ? null
      : deps.findRemoteMountForPath(project.rootPath, deps.getActiveRemoteMounts());
    const checkoutDirName = `checkout-${worktreeId.slice(0, 8)}`;
    const workspace = project.location?.kind === "ssh"
      ? `~/.nora/projects/${project.id}/sessions/${session.id}/worktrees/${worktreeId}/${checkoutDirName}`
      : remoteMount?.localMount
        ? path.join(remoteMount.localMount, ".nora", "projects", project.id, "sessions", session.id, "worktrees", worktreeId, checkoutDirName)
        : getWorktreeRepoDir(project.id, session.id, worktreeId);
    return {
      id: worktreeId,
      projectId: project.id,
      sessionId: session.id,
      path: workspace,
      location: project.location,
      branch,
      createdFromRef: "HEAD",
      createdAt: deps.nowIso(),
      updatedAt: deps.nowIso(),
      lastUsedAt: deps.nowIso(),
      status: "creating",
      writerAgentId: null,
      readerAgentIds: [],
      terminalSessionIds: [],
      scripts: []
    };
  }

  async function createWorktree(
    project: ProjectSummary,
    session: SessionRecord,
    agentName: string,
    plannedWorktree?: WorktreeRecord
  ): Promise<WorktreeRecord> {
    const worktree = plannedWorktree || planManagedWorktree(project, session, agentName);
    await fs.mkdir(getWorktreeDir(project.id, session.id, worktree.id), { recursive: true });
    if (project.location?.kind !== "ssh") {
      await fs.mkdir(path.dirname(worktree.path), { recursive: true });
    }
    await deps.execGit(deps.getProjectTarget(project), ["worktree", "add", "-b", worktree.branch, worktree.path, "HEAD"]);
    const readyWorktree: WorktreeRecord = {
      ...worktree,
      status: "ready",
      updatedAt: deps.nowIso(),
      lastUsedAt: deps.nowIso(),
      scripts: await deps.detectWorkspaceScripts(deps.getWorktreeTarget(project, worktree))
    };
    await writeWorktreeMetadata(readyWorktree);
    return readyWorktree;
  }

  async function checkoutBranchForLaunch(
    target: WorkspaceTarget,
    branchCheckout: NonNullable<CreateAgentPayload["branchCheckout"]>
  ): Promise<string> {
    const args = branchCheckout.mode === "new"
      ? ["checkout", "-b", branchCheckout.branchName]
      : ["checkout", branchCheckout.branchName];
    const { stdout, stderr } = await deps.execGit(target, args);
    return [`$ git ${args.join(" ")}`, stdout.trim(), stderr.trim()].filter((part) => part.length > 0).join("\n\n");
  }

  function getBranchCheckoutFailureTranscript(
    branchCheckout: NonNullable<CreateAgentPayload["branchCheckout"]>,
    error: unknown
  ): string {
    const args = branchCheckout.mode === "new"
      ? ["checkout", "-b", branchCheckout.branchName]
      : ["checkout", branchCheckout.branchName];
    const stdout = error && typeof error === "object" && "stdout" in error && typeof error.stdout === "string" ? error.stdout : "";
    const stderr = error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string" ? error.stderr : "";
    const message = error instanceof Error ? error.message : "Unknown error";
    return [`$ git ${args.join(" ")}`, stdout.trim(), stderr.trim(), `[branch checkout failed] ${message}`]
      .filter((part) => part.length > 0)
      .join("\n\n");
  }

  async function attachAgentToWorktree(agent: AgentSession, worktree: WorktreeRecord): Promise<WorktreeRecord> {
    const nextWorktree: WorktreeRecord = {
      ...worktree,
      writerAgentId: agent.mode === "write" ? agent.id : worktree.writerAgentId,
      readerAgentIds: agent.mode === "read" ? [...new Set([...worktree.readerAgentIds, agent.id])] : worktree.readerAgentIds,
      updatedAt: deps.nowIso(),
      lastUsedAt: deps.nowIso()
    };
    await writeWorktreeMetadata(nextWorktree);
    return nextWorktree;
  }

  async function attachTerminalToWorktree(terminal: TerminalSession, worktree: WorktreeRecord): Promise<WorktreeRecord> {
    const nextWorktree: WorktreeRecord = {
      ...worktree,
      terminalSessionIds: [...new Set([...(worktree.terminalSessionIds || []), terminal.id])],
      updatedAt: deps.nowIso(),
      lastUsedAt: deps.nowIso()
    };
    await writeWorktreeMetadata(nextWorktree);
    return nextWorktree;
  }

  async function detachAgentFromWorktree(agent: AgentSession, existingWorktree: WorktreeRecord | null): Promise<WorktreeRecord | null> {
    if (!existingWorktree) {
      return null;
    }
    const next: WorktreeRecord = {
      ...existingWorktree,
      writerAgentId: existingWorktree.writerAgentId === agent.id ? null : existingWorktree.writerAgentId,
      readerAgentIds: existingWorktree.readerAgentIds.filter((readerId) => readerId !== agent.id),
      updatedAt: deps.nowIso(),
      lastUsedAt: deps.nowIso()
    };
    await writeWorktreeMetadata(next);
    return next;
  }

  async function detachTerminalFromWorktree(terminal: TerminalSession, existingWorktree: WorktreeRecord | null): Promise<WorktreeRecord | null> {
    if (!existingWorktree) {
      return null;
    }
    const next: WorktreeRecord = {
      ...existingWorktree,
      terminalSessionIds: (existingWorktree.terminalSessionIds || []).filter((sessionId) => sessionId !== terminal.id),
      updatedAt: deps.nowIso(),
      lastUsedAt: deps.nowIso()
    };
    await writeWorktreeMetadata(next);
    return next;
  }

  async function writeWorktreeMetadata(worktree: WorktreeRecord): Promise<void> {
    try {
      const filePath = getWorktreeMetaPath(worktree.projectId, worktree.sessionId, worktree.id);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(worktree, null, 2), "utf8");
    } catch {
      // ignore metadata write failures
    }
  }

  return {
    attachAgentToWorktree,
    attachTerminalToWorktree,
    checkoutBranchForLaunch,
    createInitialSessionState,
    createWorktree,
    detachAgentFromWorktree,
    detachTerminalFromWorktree,
    getBranchCheckoutFailureTranscript,
    getOrCreateRootWorktree,
    planManagedWorktree,
    upsertSession,
    upsertWorkspaceSummary,
    upsertWorktree,
    writeWorktreeMetadata
  };
}
