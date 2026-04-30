import type {
  AgentPromptDispatchResult,
  AgentPromptSubmission,
  AgentContextPreview,
  AppState,
  CreateAgentPayload,
  CreateTerminalPayload,
  LocalTerminalState
} from "@shared/appTypes";
import type { SessionService } from "../../types/mainServices.types";
import {
  buildContextBundleMarkdown,
  buildPromptContextEntries,
  buildPromptText,
  estimateContextSize,
  resolveSelectedContextEntries
} from "../agentContextArtifacts";
import {
  clearAgentContext as clearAgentContextAction,
  clearAgentTerminal as clearAgentTerminalAction,
  clearTerminal as clearTerminalAction,
  sendAgentInput as sendAgentInputAction,
  sendAgentTerminalInput as sendAgentTerminalInputAction,
  sendTerminalInput as sendTerminalInputAction
} from "../agentTerminalActions";
import { stopAllAgentsGracefully as stopAllAgentsGracefullyAction } from "../sessionActions";
import type { SessionMainServiceDeps } from "./sessionMainService.types";

export class SessionMainService implements SessionService {
  constructor(private readonly d: SessionMainServiceDeps) {}

  createAgent = (payload: CreateAgentPayload): Promise<AppState> => this.d.sessionCreation.createAgent(payload);

  createTerminal = (payload: CreateTerminalPayload): Promise<AppState> =>
    this.d.sessionCreation.createTerminal(payload);

  openLocalTerminal = (shellId?: string): Promise<LocalTerminalState> =>
    this.d.localTerminal.openLocalTerminal(shellId);

  clearAgentContext = (agentId: string): Promise<AgentContextPreview> =>
    clearAgentContextAction(this.d.getAgentTerminalActionDependencies(), agentId);

  clearAgentTerminal = (agentId: string): Promise<AppState> =>
    clearAgentTerminalAction(this.d.getAgentTerminalActionDependencies(), agentId);

  clearTerminal = (sessionId: string): Promise<AppState> =>
    clearTerminalAction(this.d.getAgentTerminalActionDependencies(), sessionId);

  clearLocalTerminal = (): Promise<LocalTerminalState | null> => this.d.localTerminal.clearLocalTerminal();

  sendAgentInput = (agentId: string, input: string): Promise<AppState> =>
    sendAgentInputAction(this.d.getAgentTerminalActionDependencies(), agentId, input);

  sendAgentPrompt = async (
    agentId: string,
    input: AgentPromptSubmission
  ): Promise<AgentPromptDispatchResult> => {
    const targetAgent = this.d.getSnapshot().agents.find((entry) => entry.id === agentId);
    if (!targetAgent) {
      throw new Error("Agent session could not be found.");
    }

    const createdAt = this.d.nowIso();
    const agentsById = new Map(
      this.d.getSnapshot().agents
        .filter((entry) => entry.projectId === targetAgent.projectId)
        .map((entry) => [entry.id, entry] as const)
    );
    const uniqueSourceIds = [...new Set(input.contextSelections.map((selection) => selection.sourceAgentId))];
    const entriesByAgentId = new Map(
      await Promise.all(uniqueSourceIds.map(async (sourceAgentId) => {
        const sourceAgent = agentsById.get(sourceAgentId);
        if (!sourceAgent) {
          return [sourceAgentId, [] as import("@shared/appTypes").AgentContextEntry[]] as const;
        }
        return [sourceAgentId, await this.d.readAgentContextEntries(sourceAgent)] as const;
      }))
    );
    const selectedSources = resolveSelectedContextEntries({
      selections: input.contextSelections,
      agentsById,
      entriesByAgentId
    });
    const bundleId = selectedSources.length > 0 ? this.d.randomId() : null;
    const bundleFilePath = bundleId
      ? await this.d.writeAgentContextBundle(
          targetAgent,
          bundleId,
          buildContextBundleMarkdown({
            bundleId,
            createdAt,
            targetAgent,
            sources: selectedSources
          })
        )
      : null;
    const compiledPrompt = buildPromptText(input, bundleFilePath);
    const contextEntries = buildPromptContextEntries({
      agent: targetAgent,
      submission: input,
      createdAt,
      bundleFilePath,
      sourceEntries: selectedSources
    });

    if (contextEntries.length > 0) {
      await this.d.appendAgentContextEntries(targetAgent, contextEntries);
    }

    if (compiledPrompt.trim()) {
      await sendAgentInputAction(this.d.getAgentTerminalActionDependencies(), agentId, compiledPrompt);
    }

    return {
      agentId,
      bundleFilePath,
      compiledPrompt,
      estimate: estimateContextSize(compiledPrompt.length)
    };
  };

  sendAgentTerminalInput = (agentId: string, input: string): Promise<void> =>
    sendAgentTerminalInputAction(this.d.getAgentTerminalActionDependencies(), agentId, input);

  sendTerminalInput = (sessionId: string, input: string): Promise<void> =>
    sendTerminalInputAction(this.d.getAgentTerminalActionDependencies(), sessionId, input);

  resizeAgentTerminal = (agentId: string, cols: number, rows: number): AppState =>
    this.resizeTerminal(agentId, cols, rows);

  resizeTerminal = (sessionId: string, cols: number, rows: number): AppState => {
    this.d.resizeRuntimeSession(sessionId, cols, rows);
    return this.d.getSnapshot();
  };

  focusWorktree = (worktreeId: string): Promise<AppState> => this.d.sessionLifecycle.focusWorktree(worktreeId);

  focusAgent = (agentId: string): Promise<AppState> => this.d.sessionLifecycle.focusAgent(agentId);

  focusTerminal = (sessionId: string): Promise<AppState> => this.d.sessionLifecycle.focusTerminal(sessionId);

  restartAgent = (agentId: string): Promise<AppState> => this.d.sessionLifecycle.restartAgent(agentId);

  restartTerminal = (sessionId: string): Promise<AppState> => this.d.sessionLifecycle.restartTerminal(sessionId);

  restartLocalTerminal = (): Promise<LocalTerminalState> => this.d.localTerminal.restartLocalTerminal();

  destroyAgent = (agentId: string): Promise<AppState> => this.d.sessionLifecycle.destroyAgent(agentId);

  destroyTerminal = (sessionId: string): Promise<AppState> => this.d.sessionLifecycle.destroyTerminal(sessionId);

  destroyLocalTerminal = (): Promise<LocalTerminalState | null> => this.d.localTerminal.destroyLocalTerminal();

  stopAllAgentsGracefully = (
    onProgress?: (payload: { detail: string; command: string | null }) => void
  ): Promise<void> => stopAllAgentsGracefullyAction(this.d.getSessionActionDependencies(), onProgress);
}
