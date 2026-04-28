import type {
  AgentSession,
  AppState,
  CreateAgentPayload,
  CreateTerminalPayload,
  TerminalSession
} from "@shared/appTypes";
import type {
  SessionCreationDeps,
  SessionCreationHelpers
} from "../types/orchestratorSessionCreation.types";

export function createSessionCreationHelpers(deps: SessionCreationDeps): SessionCreationHelpers {
  async function createAgent(payload: CreateAgentPayload): Promise<AppState> {
    const state = deps.getSnapshot();
    if (!state.project) {
      throw new Error("Choose a project before launching an agent.");
    }
    const project = state.project;

    const tool = state.agentCatalog.find((item) => item.id === payload.toolId);
    if (!tool) {
      throw new Error(`Unknown agent tool: ${payload.toolId}`);
    }
    const isDirectSshProject = project.location?.kind === "ssh";
    if (!tool.enabled) {
      throw new Error(`${tool.label} is disabled in settings.`);
    }
    if (!isDirectSshProject && (!tool.detected || !tool.detectedCommand)) {
      throw new Error(`${tool.label} is not installed yet.`);
    }

    const agentName = (payload.name || tool.label).trim();
    const launchCommand = deps.resolveAgentLaunchCommand(tool, payload);
    const agentId = deps.randomId();
    const toolEnv = deps.getToolEnv(tool.id);
    let provisionalAgent: AgentSession | null = null;
    const { session, worktree, createdWorktree } = await deps.resolveWorktreeForSpawn(
      project,
      payload,
      agentName,
      async (pendingSession, pendingWorktree) => {
        const pendingContextPaths = deps.getWorktreeArtifactPaths(project.id, pendingSession.id, pendingWorktree.id, agentId);
        const pendingTranscript = [`[creating worktree] ${pendingWorktree.branch}`, pendingWorktree.path].join("\n");
        provisionalAgent = {
          id: agentId,
          projectId: project.id,
          sessionId: pendingSession.id,
          worktreeId: pendingWorktree.id,
          mode: payload.mode,
          name: agentName,
          toolId: tool.id,
          toolLabel: tool.label,
          status: "starting",
          workspace: pendingWorktree.path,
          branch: pendingWorktree.branch,
          host: project.location?.kind === "ssh" ? project.location.host : "local",
          task: (payload.task || `Run ${tool.label}`).trim(),
          command: launchCommand,
          pid: null,
          lastEventAt: deps.nowIso(),
          lastTerminalLine: "Creating worktree...",
          resumeSessionId: null,
          resumeCommand: null,
          contextFilePath: pendingContextPaths.contextFilePath,
          terminalStreamPath: pendingContextPaths.terminalStreamPath,
          isBusy: true,
          busyUntil: deps.futureIso(15000),
          terminalOutput: [],
          rawTerminalOutput: pendingTranscript,
          changeSummary: null
        };
        deps.setTerminalBuffer(agentId, pendingTranscript);
        await deps.initializeAgentContextFiles(provisionalAgent);

        deps.updateState((currentState) => {
          const nextSessions = deps.upsertSession(currentState.sessions, {
            ...pendingSession,
            focusedWorktreeId: pendingWorktree.id,
            updatedAt: deps.nowIso(),
            lastUsedAt: deps.nowIso()
          });
          const nextWorktrees = deps.upsertWorktree(currentState.worktrees, pendingWorktree);
          const nextAgents = [...currentState.agents, provisionalAgent!];

          return {
            ...currentState,
            currentSessionId: pendingSession.id,
            sessions: nextSessions,
            worktrees: nextWorktrees,
            agents: nextAgents,
            workspaces: deps.upsertWorkspaceSummary(currentState.workspaces, {
              project,
              sessions: nextSessions,
              worktrees: nextWorktrees,
              agents: nextAgents,
              terminals: currentState.terminals
            }),
            focusedAgentId: agentId,
            focusedTerminalId: null,
            errorMessage: null
          };
        });
      }
    );

    const contextPaths = deps.getWorktreeArtifactPaths(project.id, session.id, worktree.id, agentId);
    const prepareCommand = (payload.prepareCommand || "").trim();
    const shouldPrepareWorktree = createdWorktree && !!payload.prepareWorktree && !!prepareCommand;
    const pendingAgent = provisionalAgent;
    const branchCheckout = payload.branchCheckout?.branchName.trim()
      ? {
          ...payload.branchCheckout,
          branchName: payload.branchCheckout.branchName.trim()
        }
      : null;
    const branchCheckoutStatusLine = branchCheckout
      ? (branchCheckout.mode === "new" ? "Creating branch..." : "Checking out branch...")
      : null;
    const launchStatusLine = branchCheckoutStatusLine ||
      (shouldPrepareWorktree ? "Preparing worktree..." : (payload.task || `Launching ${tool.label}`).trim());

    const agent: AgentSession = pendingAgent
      ? {
          ...(pendingAgent as AgentSession),
          sessionId: session.id,
          worktreeId: worktree.id,
          workspace: worktree.path,
          branch: worktree.branch,
          lastEventAt: deps.nowIso(),
          lastTerminalLine: launchStatusLine,
          contextFilePath: contextPaths.contextFilePath,
          terminalStreamPath: contextPaths.terminalStreamPath,
          busyUntil: deps.futureIso(2500)
        }
      : {
          id: agentId,
          projectId: project.id,
          sessionId: session.id,
          worktreeId: worktree.id,
          mode: payload.mode,
          name: agentName,
          toolId: tool.id,
          toolLabel: tool.label,
          status: "starting",
          workspace: worktree.path,
          branch: worktree.branch,
          host: project.location?.kind === "ssh" ? project.location.host : "local",
          task: (payload.task || `Run ${tool.label}`).trim(),
          command: launchCommand,
          pid: null,
          lastEventAt: deps.nowIso(),
          lastTerminalLine: launchStatusLine,
          resumeSessionId: null,
          resumeCommand: null,
          contextFilePath: contextPaths.contextFilePath,
          terminalStreamPath: contextPaths.terminalStreamPath,
          isBusy: true,
          busyUntil: deps.futureIso(2500),
          terminalOutput: [],
          rawTerminalOutput: "",
          changeSummary: null
        };

    if (!pendingAgent) {
      deps.setTerminalBuffer(agentId, agent.rawTerminalOutput);
      await deps.initializeAgentContextFiles(agent);
    }
    await deps.attachAgentToWorktree(agent, worktree);

    deps.updateState((currentState) => {
      const nextSessions = deps.upsertSession(currentState.sessions, session);
      const nextWorktrees = deps.upsertWorktree(currentState.worktrees, {
        ...worktree,
        writerAgentId: payload.mode === "write" ? agentId : worktree.writerAgentId,
        readerAgentIds:
          payload.mode === "read" ? [...new Set([...worktree.readerAgentIds, agentId])] : worktree.readerAgentIds,
        updatedAt: deps.nowIso(),
        lastUsedAt: deps.nowIso()
      });
      const nextAgents = pendingAgent
        ? currentState.agents.map((existingAgent) => (existingAgent.id === agentId ? agent : existingAgent))
        : [...currentState.agents, agent];

      return {
        ...currentState,
        currentSessionId: session.id,
        sessions: nextSessions,
        worktrees: nextWorktrees,
        agents: nextAgents,
        workspaces: deps.upsertWorkspaceSummary(currentState.workspaces, {
          project,
          sessions: nextSessions,
          worktrees: nextWorktrees,
          agents: nextAgents,
          terminals: currentState.terminals
        }),
        focusedAgentId: agentId,
        focusedTerminalId: null,
        errorMessage: null
      };
    });
    await deps.persistWorkspaceState(deps.getSnapshot());

    if (branchCheckout) {
      const branchName = branchCheckout.branchName;
      deps.updateAgent(agentId, {
        lastTerminalLine: branchCheckout.mode === "new" ? "Creating branch..." : "Checking out branch...",
        lastEventAt: deps.nowIso(),
        isBusy: true,
        busyUntil: deps.futureIso(8000)
      });

      try {
        const transcript = await deps.checkoutBranchForLaunch(deps.getWorktreeTarget(project, worktree), branchCheckout);
        if (transcript && project.location?.kind !== "ssh") {
          deps.appendAgentSystemMessage(agentId, transcript);
        }

        deps.updateState((currentState) => ({
          ...currentState,
          worktrees: currentState.worktrees.map((entry) =>
            entry.id === worktree.id
              ? {
                  ...entry,
                  branch: branchName,
                  updatedAt: deps.nowIso(),
                  lastUsedAt: deps.nowIso()
                }
              : entry
          )
        }));
        deps.updateAgent(agentId, {
          branch: branchName,
          lastTerminalLine: shouldPrepareWorktree
            ? "Preparing worktree..."
            : (payload.task || `Launching ${tool.label}`).trim(),
          lastEventAt: deps.nowIso(),
          isBusy: true,
          busyUntil: deps.futureIso(2500)
        });
        await deps.persistWorkspaceState(deps.getSnapshot());
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown error";
        const transcript = deps.getBranchCheckoutFailureTranscript(branchCheckout, error);
        deps.setTerminalBuffer(agentId, transcript);
        deps.updateAgent(agentId, {
          status: "error",
          branch: branchName,
          lastTerminalLine: "Branch checkout failed",
          rawTerminalOutput: transcript,
          isBusy: false,
          busyUntil: null,
          lastEventAt: deps.nowIso()
        });
        deps.updateState((currentState) => ({
          ...currentState,
          errorMessage: `Branch checkout failed: ${detail}`
        }));
        return deps.refreshProjectState();
      }
    }

    if (shouldPrepareWorktree) {
      try {
        await deps.prepareWorktree(deps.getWorktreeTarget(project, worktree), prepareCommand);
        deps.updateAgent(agentId, {
          lastTerminalLine: (payload.task || `Launching ${tool.label}`).trim(),
          lastEventAt: deps.nowIso()
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown error";
        const transcript = deps.getPreparationFailureTranscript(prepareCommand, error);
        deps.updateAgent(agentId, {
          status: "error",
          lastTerminalLine: "Worktree preparation failed",
          rawTerminalOutput: transcript,
          isBusy: false,
          busyUntil: null,
          lastEventAt: deps.nowIso()
        });
        deps.setTerminalBuffer(agentId, transcript);
        deps.updateState((currentState) => ({
          ...currentState,
          errorMessage: `Worktree preparation failed: ${detail}`
        }));
        return deps.refreshProjectState();
      }
    }

    try {
      await deps.spawnAgentPty(agentId, launchCommand, deps.getWorktreeTarget(project, worktree), toolEnv);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      const transcript = `[launch failed] ${detail}`;
      deps.setTerminalBuffer(agentId, transcript);
      deps.updateAgent(agentId, {
        status: "error",
        pid: null,
        lastTerminalLine: "Agent launch failed",
        rawTerminalOutput: transcript,
        isBusy: false,
        busyUntil: null,
        lastEventAt: deps.nowIso()
      });
      deps.updateState((currentState) => ({
        ...currentState,
        errorMessage: `Agent launch failed: ${detail}`
      }));
      return project.location?.kind === "ssh" ? deps.getSnapshot() : deps.refreshProjectState();
    }

    return project.location?.kind === "ssh" ? deps.getSnapshot() : deps.refreshProjectState();
  }

  async function createTerminal(payload: CreateTerminalPayload): Promise<AppState> {
    const state = deps.getSnapshot();
    if (!state.project) {
      throw new Error("Choose a project before opening a terminal.");
    }
    const project = state.project;

    const terminalId = deps.randomId();
    const terminalName = (payload.name || payload.launchConfig.label || "Terminal").trim();
    const { session, worktree } = await deps.resolveWorktreeForTerminal(project, payload.target);
    const shell = deps.resolveTerminalShell(payload.shellId);
    const terminal: TerminalSession = {
      id: terminalId,
      projectId: project.id,
      sessionId: session.id,
      worktreeId: worktree.id,
      name: terminalName,
      status: "starting",
      workspace: worktree.path,
      branch: worktree.branch,
      host: project.location?.kind === "ssh" ? project.location.host : "local",
      shellId: shell.id,
      shellLabel: shell.label,
      command: payload.launchConfig.kind === "blank" ? "" : payload.launchConfig.command.trim(),
      pid: null,
      lastEventAt: deps.nowIso(),
      lastTerminalLine: payload.launchConfig.label,
      launchConfig: payload.launchConfig,
      rawTerminalOutput: "",
      detectedLocalUrl: null,
      detectedLocalPort: null,
      changeSummary: null
    };

    deps.setTerminalBuffer(terminalId, "");
    deps.setLiveTerminalSnapshot(terminalId, terminal);
    await deps.attachTerminalToWorktree(terminal, worktree);

    deps.updateState((currentState) => {
      const nextSessions = deps.upsertSession(currentState.sessions, session);
      const nextWorktrees = deps.upsertWorktree(currentState.worktrees, {
        ...worktree,
        terminalSessionIds: [...new Set([...(worktree.terminalSessionIds || []), terminalId])],
        updatedAt: deps.nowIso(),
        lastUsedAt: deps.nowIso()
      });
      const nextTerminals = [...currentState.terminals, terminal];

      return {
        ...currentState,
        currentSessionId: session.id,
        sessions: nextSessions,
        worktrees: nextWorktrees,
        terminals: nextTerminals,
        workspaces: deps.upsertWorkspaceSummary(currentState.workspaces, {
          project,
          sessions: nextSessions,
          worktrees: nextWorktrees,
          agents: currentState.agents,
          terminals: nextTerminals
        }),
        focusedAgentId: null,
        focusedTerminalId: terminalId,
        errorMessage: null
      };
    });
    await deps.persistWorkspaceState(deps.getSnapshot());

    await deps.spawnTerminalPty(terminalId, terminal.command, deps.getWorktreeTarget(project, worktree), shell);
    return deps.refreshProjectState();
  }

  return {
    createAgent,
    createTerminal
  };
}
