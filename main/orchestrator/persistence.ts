import type { AgentSession, AppState, TerminalSession } from "@shared/appTypes";
import fs from "node:fs/promises";
import type { PersistenceHelperDeps, PersistenceHelpers } from "../types/orchestratorPersistence.types";

export function createPersistenceHelpers(deps: PersistenceHelperDeps): PersistenceHelpers {
  function getPersistedSessionPayload(state: AppState, sessionId: string) {
    const session = state.sessions.find((entry) => entry.id === sessionId);
    if (!state.project || !session) {
      throw new Error("Cannot persist session without an active project and session.");
    }

    return {
      projectId: state.project.id,
      session: {
        ...session,
        updatedAt: deps.nowIso(),
        lastUsedAt: deps.nowIso(),
        focusedWorktreeId:
          state.worktrees.find((worktree) => worktree.id === session.focusedWorktreeId)?.id ||
          state.agents.find((agent) => agent.id === state.focusedAgentId && agent.sessionId === session.id)?.worktreeId ||
          session.focusedWorktreeId
      },
      focusedAgentId:
        state.agents.find((agent) => agent.id === state.focusedAgentId && agent.sessionId === session.id)?.id || null,
      focusedTerminalId:
        state.terminals.find((terminal) => terminal.id === state.focusedTerminalId && terminal.sessionId === session.id)?.id || null,
      selectedChangePath: state.currentSessionId === session.id ? state.selectedChangePath : null,
      selectedCommitHash: state.currentSessionId === session.id ? state.selectedCommitHash : null,
      agents: state.agents
        .filter((agent) => agent.sessionId === session.id)
        .map((agent) => {
          const status: AgentSession["status"] =
            agent.status === "running" || agent.status === "starting"
              ? "starting"
              : agent.status;
          return {
            ...agent,
            pid: null,
            status
          };
        }),
      terminals: state.terminals
        .filter((terminal) => terminal.sessionId === session.id)
        .map((terminal) => {
          const status: TerminalSession["status"] =
            terminal.status === "running" || terminal.status === "starting"
              ? "starting"
              : terminal.status;
          return {
            ...terminal,
            pid: null,
            status,
            detectedLocalUrl: terminal.host === "local" ? terminal.detectedLocalUrl : null,
            detectedLocalPort: terminal.host === "local" ? terminal.detectedLocalPort : null
          };
        }),
      worktrees: state.worktrees.filter((worktree) => worktree.sessionId === session.id)
    };
  }

  async function persistWorkspaceState(state: AppState): Promise<void> {
    if (!state.project || state.screen !== "workspace" || !state.currentSessionId) {
      return;
    }

    await deps.saveProject(state.project);
    for (const session of state.sessions) {
      await deps.saveSessionState(getPersistedSessionPayload(state, session.id));
    }
  }

  async function restoreWorkspaceState(): Promise<void> {
    const recentProjects = await deps.loadRecentProjects();
    const indexedProjects = await deps.loadIndexedProjects();
    const project = recentProjects[0]
      ? await deps.getProjectMetadata(await deps.resolveProjectTarget(recentProjects[0].rootPath))
        .then((resolvedProject) =>
          deps.mergePersistedProjectSummary(
            resolvedProject,
            indexedProjects.find((entry) => entry.rootPath === recentProjects[0].rootPath) || null
          )
        )
        .catch(() => null)
      : null;
    if (!project) {
      return;
    }

    await deps.focusWorkspace(project.id);
  }

  async function getRestorableAgents(agents: AgentSession[]): Promise<AgentSession[]> {
    const restored: AgentSession[] = [];

    for (const agent of agents) {
      try {
        if (agent.host !== "local") {
          // Direct SSH workspaces are not addressable on the local filesystem.
        } else {
          await fs.access(agent.workspace);
        }
        const contextPaths = deps.getWorktreeArtifactPaths(agent.projectId, agent.sessionId, agent.worktreeId, agent.id);
        deps.setTerminalBuffer(agent.id, "");
        restored.push({
          ...agent,
          pid: null,
          status: "starting",
          lastEventAt: deps.nowIso(),
          lastTerminalLine: agent.lastTerminalLine || "",
          resumeSessionId: agent.resumeSessionId || null,
          resumeCommand: agent.resumeCommand || null,
          contextFilePath: contextPaths.contextFilePath,
          terminalStreamPath: contextPaths.terminalStreamPath,
          isBusy: false,
          busyUntil: null,
          terminalOutput: [],
          rawTerminalOutput: ""
        });
      } catch {
        continue;
      }
    }

    return restored;
  }

  async function getRestorableTerminals(terminals: TerminalSession[]): Promise<TerminalSession[]> {
    const restored: TerminalSession[] = [];

    for (const terminal of terminals) {
      try {
        if (terminal.host !== "local") {
          // Direct SSH workspaces are not addressable on the local filesystem.
        } else {
          await fs.access(terminal.workspace);
        }
        const shell = deps.resolveTerminalShell(terminal.shellId);
        deps.setTerminalBuffer(terminal.id, "");
        restored.push({
          ...terminal,
          shellId: shell.id,
          shellLabel: shell.label,
          command:
            terminal.launchConfig.kind === "blank"
              ? ""
              : terminal.command,
          pid: null,
          status: "starting",
          isBusy: true,
          lastEventAt: deps.nowIso(),
          lastTerminalLine: terminal.lastTerminalLine || "",
          currentWorkingDirectory: terminal.currentWorkingDirectory || terminal.workspace,
          rawTerminalOutput: "",
          detectedLocalUrl: terminal.host === "local" ? (terminal.detectedLocalUrl || null) : null,
          detectedLocalPort:
            terminal.host === "local" && typeof terminal.detectedLocalPort === "number"
              ? terminal.detectedLocalPort
              : null
        });
      } catch {
        continue;
      }
    }

    return restored;
  }

  return {
    persistWorkspaceState,
    restoreWorkspaceState,
    getRestorableAgents,
    getRestorableTerminals,
    getPersistedSessionPayload
  };
}
