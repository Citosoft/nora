import type { AgentContextPreview, AppState, LocalTerminalState } from "@shared/appTypes";
import type { SnapshotService } from "../../types/mainServices.types";
import type { SnapshotMainServiceTransport } from "./orchestratorMainServiceAssembly.types";

export type SnapshotMainServiceDeps = SnapshotMainServiceTransport & {
  readContextFile: (contextFilePath: string) => Promise<string>;
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
}
