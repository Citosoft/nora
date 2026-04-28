import type { SnapshotService } from "../types/mainServices.types";

type SnapshotServiceDeps = {
  getSnapshot: SnapshotService["getSnapshot"];
  getTerminalBuffer: SnapshotService["getTerminalBuffer"];
  getLocalTerminalState: SnapshotService["getLocalTerminalState"];
  readContextFile: (contextFilePath: string) => Promise<string>;
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
    }
  };
}
