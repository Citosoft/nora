import type { AgentContextEntry } from "@shared/appTypes";
import type { SnapshotService } from "../types/mainServices.types";
import {
  buildAgentContextSourceSummary,
  buildAgentContextState
} from "../orchestrator/agentContextArtifacts";

type SnapshotServiceDeps = {
  getSnapshot: SnapshotService["getSnapshot"];
  getTerminalBuffer: SnapshotService["getTerminalBuffer"];
  getLocalTerminalState: SnapshotService["getLocalTerminalState"];
  readContextFile: (contextFilePath: string) => Promise<string>;
  readContextEntries: (contextFilePath: string) => Promise<AgentContextEntry[]>;
};

export function createSnapshotService(deps: SnapshotServiceDeps): SnapshotService {
  return {
    getSnapshot: deps.getSnapshot,
    getAgentTerminalBuffer: (agentId: string) => deps.getTerminalBuffer(agentId),
    getTerminalBuffer: deps.getTerminalBuffer,
    getLocalTerminalState: deps.getLocalTerminalState,
    async getAgentContextPreview(agentId: string) {
      const agent = deps.getSnapshot().agents.find((item) => item.id === agentId);
      if (!agent) {
        throw new Error("Agent session could not be found.");
      }

      const content = await deps.readContextFile(agent.contextFilePath);
      return {
        contextFilePath: agent.contextFilePath,
        terminalStreamPath: agent.terminalStreamPath,
        content
      };
    },
    async getAgentContextState(agentId: string) {
      const agent = deps.getSnapshot().agents.find((item) => item.id === agentId);
      if (!agent) {
        throw new Error("Agent session could not be found.");
      }

      return buildAgentContextState(agent, await deps.readContextEntries(agent.contextFilePath));
    },
    async listWorkspaceAgentContextSources(projectId: string, excludeAgentId?: string) {
      const agents = deps.getSnapshot().agents.filter((item) => item.projectId === projectId && item.id !== excludeAgentId);
      const summaries = await Promise.all(
        agents.map(async (agent) =>
          buildAgentContextSourceSummary(agent, await deps.readContextEntries(agent.contextFilePath))
        )
      );

      return summaries
        .filter((summary) => summary.entryCount > 0)
        .sort((left, right) => (right.lastUpdatedAt || "").localeCompare(left.lastUpdatedAt || ""));
    }
  };
}
