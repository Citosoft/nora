import type {
  AgentCatalogEntry,
  AgentSession,
  AgentSkillCatalog,
  LocalTerminalState,
  TerminalSession
} from "@shared/appTypes";
import type {
  TerminalStateHelperDeps,
  TerminalStateHelpers
} from "../types/orchestratorTerminalState.types";
import {
  capTerminalOutput,
  shouldPublishThrottledTerminalStateUpdate,
  shouldRescanTerminalLastLine,
  shouldRescanTerminalMetadata
} from "./terminalPerformance";

export function createTerminalStateHelpers(deps: TerminalStateHelperDeps): TerminalStateHelpers {
  const AGENT_STATE_UPDATE_INTERVAL_MS = 1000;
  const TERMINAL_STATE_UPDATE_INTERVAL_MS = 1000;
  const LOCAL_TERMINAL_STATE_UPDATE_INTERVAL_MS = 1000;
  const AGENT_BUSY_SIGNAL_WINDOW_CHARS = 160;
  const agentLastStateUpdateAt = new Map<string, number>();
  const terminalLastStateUpdateAt = new Map<string, number>();
  const localTerminalLastStateUpdateAt = new Map<string, number>();

  function updateAgent(agentId: string, partial: Partial<AgentSession>): void {
    deps.updateState((state) => ({
      ...state,
      agents: state.agents.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              ...partial
            }
          : agent
      )
    }));
  }

  function updateTerminal(terminalId: string, partial: Partial<TerminalSession>): void {
    deps.updateState((state) => {
      let nextTerminalSnapshot: TerminalSession | null = null;
      const terminals = state.terminals.map((terminal) => {
        if (terminal.id !== terminalId) {
          return terminal;
        }
        const nextTerminal = {
          ...terminal,
          ...partial
        };
        if (
          (nextTerminal.status === "stopped" || nextTerminal.status === "error") &&
          !("detectedLocalUrl" in partial) &&
          !("detectedLocalPort" in partial)
        ) {
          nextTerminal.detectedLocalUrl = null;
          nextTerminal.detectedLocalPort = null;
        }
        nextTerminalSnapshot = nextTerminal;
        return nextTerminalSnapshot;
      });
      const workspaces = state.workspaces.map((workspace) => ({
        ...workspace,
        terminals: workspace.terminals.map((terminal) => {
          if (terminal.id !== terminalId) {
            return terminal;
          }
          const nextTerminal = {
            ...terminal,
            ...partial
          };
          nextTerminalSnapshot = nextTerminal;
          return nextTerminal;
        })
      }));

      if (nextTerminalSnapshot) {
        deps.setLiveTerminalSnapshot(terminalId, nextTerminalSnapshot);
      }

      return {
        ...state,
        terminals,
        workspaces
      };
    });
  }

  function updateLocalTerminal(partial: Partial<LocalTerminalState>): void {
    const localTerminalState = deps.getLocalTerminalState();
    if (!localTerminalState) {
      return;
    }
    const nextTerminal: LocalTerminalState = {
      ...localTerminalState,
      ...partial
    };
    if (
      (nextTerminal.status === "stopped" || nextTerminal.status === "error") &&
      !("detectedLocalUrl" in partial) &&
      !("detectedLocalPort" in partial)
    ) {
      nextTerminal.detectedLocalUrl = null;
      nextTerminal.detectedLocalPort = null;
    }
    deps.setLocalTerminalState(nextTerminal);
    deps.notifyLocalTerminalChanged(nextTerminal);
  }

  function appendAgentSystemMessage(agentId: string, message: string): void {
    const chunk = `\n${message}\n`;
    const existing = deps.getTerminalBuffer(agentId);
    deps.setTerminalBuffer(agentId, capTerminalOutput(`${existing}${chunk}`));
    const agent = deps.getSnapshot().agents.find((item) => item.id === agentId);
    if (agent?.contextFilePath && agent.terminalStreamPath) {
      deps.queueAgentContextAppend(agent, chunk);
    }
    deps.emitTerminalData(agentId, chunk);
  }

  function appendAgentOutput(agentId: string, chunk: string): void {
    const existing = deps.getTerminalBuffer(agentId);
    const nextOutput = capTerminalOutput(`${existing}${chunk}`);
    deps.setTerminalBuffer(agentId, nextOutput);
    const currentAgent = deps.getSnapshot().agents.find((agent) => agent.id === agentId);
    if (currentAgent?.contextFilePath && currentAgent.terminalStreamPath) {
      deps.queueAgentContextAppend(currentAgent, chunk);
    }
    const shouldRescanLine = shouldRescanTerminalLastLine(chunk);
    const lastTerminalLine = shouldRescanLine
      ? deps.getLastMeaningfulAgentOutputLine(chunk) ||
        deps.getLastMeaningfulAgentOutputLine(nextOutput.slice(-4000)) ||
        currentAgent?.lastTerminalLine ||
        ""
      : (currentAgent?.lastTerminalLine || "");
    const busySignalWindow = `${existing.slice(-AGENT_BUSY_SIGNAL_WINDOW_CHARS)}${chunk}`;
    const hasBusyActivity = deps.hasBusyTerminalActivity(busySignalWindow);
    const now = Date.now();
    const recentActivity = hasBusyActivity
      ? [...(deps.getTerminalActivity(agentId) || []), now].filter((timestamp) => now - timestamp < 900)
      : (deps.getTerminalActivity(agentId) || []).filter((timestamp) => now - timestamp < 900);
    deps.setTerminalActivity(agentId, recentActivity);
    const isBusy = hasBusyActivity || recentActivity.length >= 3;
    const resumeDetails = currentAgent ? deps.extractResumeDetails(currentAgent, chunk) : null;
    const busyUntil = isBusy
      ? deps.futureIso(hasBusyActivity ? 2200 : 900)
      : currentAgent?.busyUntil || null;
    const hasCriticalChange =
      !!resumeDetails ||
      (currentAgent?.isBusy ?? false) !== isBusy ||
      (currentAgent?.lastTerminalLine ?? "") !== lastTerminalLine;
    const lastUpdatedAt = agentLastStateUpdateAt.get(agentId) || 0;
    if (shouldPublishThrottledTerminalStateUpdate({
      now,
      lastUpdatedAt,
      intervalMs: AGENT_STATE_UPDATE_INTERVAL_MS,
      hasCriticalChange
    })) {
      updateAgent(agentId, {
        lastEventAt: deps.nowIso(),
        lastTerminalLine,
        ...(resumeDetails || {}),
        isBusy,
        busyUntil
      });
      agentLastStateUpdateAt.set(agentId, now);
    }
    if (resumeDetails) {
      const updatedAgent = deps.getSnapshot().agents.find((agent) => agent.id === agentId);
      if (updatedAgent) {
        const resumeTarget = deps.buildResumeCommand(updatedAgent) || updatedAgent.resumeSessionId;
        appendAgentSystemMessage(agentId, `[resume tracked${resumeTarget ? `: ${resumeTarget}` : ""}]`);
      }
    }
    deps.emitTerminalData(agentId, chunk);
  }

  function appendTerminalOutput(terminalId: string, chunk: string): void {
    const existing = deps.getTerminalBuffer(terminalId);
    const nextOutput = capTerminalOutput(`${existing}${chunk}`);
    deps.setTerminalBuffer(terminalId, nextOutput);
    const currentTerminal = deps.getSnapshot().terminals.find((item) => item.id === terminalId) || null;
    const shouldRescanMetadata = shouldRescanTerminalMetadata(chunk);
    const detectedLocal = shouldRescanMetadata
      ? deps.detectLocalUrlFromOutput(
          nextOutput.slice(-12000),
          currentTerminal?.host && currentTerminal.host !== "local" ? currentTerminal.host : "localhost"
        )
      : { url: null, port: null };
    const shouldRescanLine = shouldRescanTerminalLastLine(chunk);
    const lastTerminalLine = shouldRescanLine
      ? deps.getLastMeaningfulTerminalLine(chunk) ||
        deps.getLastMeaningfulTerminalLine(nextOutput.slice(-4000)) ||
        currentTerminal?.lastTerminalLine ||
        ""
      : (currentTerminal?.lastTerminalLine || "");
    const shouldClearDetectedPort =
      !!(currentTerminal?.detectedLocalUrl || currentTerminal?.detectedLocalPort) &&
      deps.didReturnToShellPrompt(chunk);
    const nextDetectedLocalUrl = shouldClearDetectedPort ? null : (detectedLocal.url || currentTerminal?.detectedLocalUrl || null);
    const nextDetectedLocalPort = shouldClearDetectedPort ? null : (detectedLocal.port || currentTerminal?.detectedLocalPort || null);
    const now = Date.now();
    const hasCriticalChange =
      (currentTerminal?.lastTerminalLine ?? "") !== lastTerminalLine ||
      (currentTerminal?.detectedLocalUrl ?? null) !== nextDetectedLocalUrl ||
      (currentTerminal?.detectedLocalPort ?? null) !== nextDetectedLocalPort;
    const lastUpdatedAt = terminalLastStateUpdateAt.get(terminalId) || 0;
    if (shouldPublishThrottledTerminalStateUpdate({
      now,
      lastUpdatedAt,
      intervalMs: TERMINAL_STATE_UPDATE_INTERVAL_MS,
      hasCriticalChange
    })) {
      updateTerminal(terminalId, {
        rawTerminalOutput: nextOutput,
        lastEventAt: deps.nowIso(),
        lastTerminalLine,
        detectedLocalUrl: nextDetectedLocalUrl,
        detectedLocalPort: nextDetectedLocalPort
      });
      terminalLastStateUpdateAt.set(terminalId, now);
    }
    deps.emitTerminalData(terminalId, chunk);
  }

  function appendLocalTerminalOutput(chunk: string): void {
    const localTerminal = deps.getLocalTerminalState();
    if (!localTerminal) {
      return;
    }
    const existing = deps.getTerminalBuffer(localTerminal.id);
    const nextOutput = capTerminalOutput(`${existing}${chunk}`);
    deps.setTerminalBuffer(localTerminal.id, nextOutput);
    const shouldRescanMetadata = shouldRescanTerminalMetadata(chunk);
    const detectedLocal = shouldRescanMetadata
      ? deps.detectLocalUrlFromOutput(nextOutput.slice(-12000), "localhost")
      : { url: null, port: null };
    const shouldRescanLine = shouldRescanTerminalLastLine(chunk);
    const lastTerminalLine = shouldRescanLine
      ? deps.getLastMeaningfulTerminalLine(chunk) ||
        deps.getLastMeaningfulTerminalLine(nextOutput.slice(-4000)) ||
        localTerminal.lastTerminalLine ||
        ""
      : localTerminal.lastTerminalLine;
    const shouldClearDetectedPort =
      !!(localTerminal.detectedLocalUrl || localTerminal.detectedLocalPort) &&
      deps.didReturnToShellPrompt(chunk);
    const nextDetectedLocalUrl = shouldClearDetectedPort ? null : (detectedLocal.url || localTerminal.detectedLocalUrl || null);
    const nextDetectedLocalPort = shouldClearDetectedPort ? null : (detectedLocal.port || localTerminal.detectedLocalPort || null);
    const now = Date.now();
    const lastUpdatedAt = localTerminalLastStateUpdateAt.get(localTerminal.id) || 0;
    const hasCriticalChange =
      localTerminal.lastTerminalLine !== lastTerminalLine ||
      (localTerminal.detectedLocalUrl ?? null) !== nextDetectedLocalUrl ||
      (localTerminal.detectedLocalPort ?? null) !== nextDetectedLocalPort;
    if (shouldPublishThrottledTerminalStateUpdate({
      now,
      lastUpdatedAt,
      intervalMs: LOCAL_TERMINAL_STATE_UPDATE_INTERVAL_MS,
      hasCriticalChange
    })) {
      updateLocalTerminal({
        rawTerminalOutput: nextOutput,
        lastEventAt: deps.nowIso(),
        lastTerminalLine,
        detectedLocalUrl: nextDetectedLocalUrl,
        detectedLocalPort: nextDetectedLocalPort
      });
      localTerminalLastStateUpdateAt.set(localTerminal.id, now);
    }
    deps.emitTerminalData(localTerminal.id, chunk);
  }

  async function resetAgentTranscript(agent: AgentSession): Promise<void> {
    deps.setTerminalBuffer(agent.id, "");
    await deps.resetAgentTranscriptFile(agent);
  }

  function resetTerminalTranscript(terminal: TerminalSession): void {
    deps.setTerminalBuffer(terminal.id, "");
    deps.deleteTerminalActivity(terminal.id);
    terminalLastStateUpdateAt.delete(terminal.id);
    updateTerminal(terminal.id, {
      rawTerminalOutput: "",
      lastTerminalLine: "",
      lastEventAt: deps.nowIso()
    });
  }

  function resetLocalTerminalTranscript(): void {
    const localTerminal = deps.getLocalTerminalState();
    if (!localTerminal) {
      return;
    }
    deps.setTerminalBuffer(localTerminal.id, "");
    deps.deleteTerminalActivity(localTerminal.id);
    localTerminalLastStateUpdateAt.delete(localTerminal.id);
    updateLocalTerminal({
      rawTerminalOutput: "",
      lastTerminalLine: "",
      lastEventAt: deps.nowIso()
    });
  }

  function updateCatalogTool(toolId: string, partial: Partial<AgentCatalogEntry>): void {
    deps.updateState((state) => ({
      ...state,
      agentCatalog: state.agentCatalog.map((item) =>
        item.id === toolId
          ? {
              ...item,
              ...partial
            }
          : item
      )
    }));
  }

  function updateAgentSkillCatalog(nextCatalog: AgentSkillCatalog): void {
    deps.updateState((state) => ({
      ...state,
      agentSkillCatalogs: [
        nextCatalog,
        ...state.agentSkillCatalogs.filter((catalog) => catalog.toolId !== nextCatalog.toolId)
      ].sort((left, right) => left.toolId.localeCompare(right.toolId))
    }));
  }

  return {
    appendAgentOutput,
    appendTerminalOutput,
    appendLocalTerminalOutput,
    appendAgentSystemMessage,
    resetAgentTranscript,
    resetTerminalTranscript,
    resetLocalTerminalTranscript,
    updateAgent,
    updateTerminal,
    updateLocalTerminal,
    updateCatalogTool,
    updateAgentSkillCatalog
  };
}
