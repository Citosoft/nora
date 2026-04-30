import type {
  AgentContextEntry,
  AgentContextPreview,
  AgentContextSourceSummary,
  AgentContextState,
  AppState,
  LocalTerminalState
} from "@shared/appTypes";
import type { SnapshotService } from "../../types/mainServices.types";
import {
  buildAgentContextSourceSummary,
  buildAgentContextState
} from "../agentContextArtifacts";
import type { SnapshotMainServiceTransport } from "./orchestratorMainServiceAssembly.types";

export type SnapshotMainServiceDeps = SnapshotMainServiceTransport & {
  readContextFile: (contextFilePath: string) => Promise<string>;
  readContextEntries: (contextFilePath: string) => Promise<AgentContextEntry[]>;
};

export class SnapshotMainService implements SnapshotService {
  constructor(private readonly d: SnapshotMainServiceDeps) {}

  getSnapshot = (): AppState => this.d.getSnapshot();

  getAgentTerminalBuffer = (agentId: string): string => this.d.getTerminalBuffer(agentId);

  getTerminalBuffer = (sessionId: string): string => this.d.getTerminalBuffer(sessionId);

  getLocalTerminalState = (): LocalTerminalState | null => this.d.getLocalTerminalState();

  getAgentContextPreview = async (agentId: string): Promise<AgentContextPreview> => {
    const agent = this.d.getSnapshot().agents.find((item) => item.id === agentId);
    if (!agent) {
      throw new Error("Agent session could not be found.");
    }
    const content = await this.d.readContextFile(agent.contextFilePath);
    return {
      contextFilePath: agent.contextFilePath,
      terminalStreamPath: agent.terminalStreamPath,
      content
    };
  };

  getAgentContextState = async (agentId: string): Promise<AgentContextState> => {
    const agent = this.d.getSnapshot().agents.find((item) => item.id === agentId);
    if (!agent) {
      throw new Error("Agent session could not be found.");
    }

    return buildAgentContextState(agent, await this.d.readContextEntries(agent.contextFilePath));
  };

  listWorkspaceAgentContextSources = async (
    projectId: string,
    excludeAgentId?: string
  ): Promise<AgentContextSourceSummary[]> => {
    const agents = this.d.getSnapshot().agents.filter((item) => item.projectId === projectId && item.id !== excludeAgentId);
    const summaries = await Promise.all(
      agents.map(async (agent) =>
        buildAgentContextSourceSummary(agent, await this.d.readContextEntries(agent.contextFilePath))
      )
    );

    return summaries
      .filter((summary) => summary.entryCount > 0)
      .sort((left, right) => (right.lastUpdatedAt || "").localeCompare(left.lastUpdatedAt || ""));
  };
}
