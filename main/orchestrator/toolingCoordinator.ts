import type { AgentToolConfig } from "@shared/appTypes";
import type { ChildProcessWithoutNullStreams } from "node:child_process";

export class ToolingCoordinator {
  private toolConfigs: Record<string, AgentToolConfig> = {};
  private readonly installSessions = new Map<string, ChildProcessWithoutNullStreams>();

  getToolConfigs(): Record<string, AgentToolConfig> {
    return this.toolConfigs;
  }

  setToolConfigs(configs: Record<string, AgentToolConfig>): void {
    this.toolConfigs = configs;
  }

  hasInstallSession(toolId: string): boolean {
    return this.installSessions.has(toolId);
  }

  setInstallSession(toolId: string, child: ChildProcessWithoutNullStreams): void {
    this.installSessions.set(toolId, child);
  }

  deleteInstallSession(toolId: string): void {
    this.installSessions.delete(toolId);
  }
}
