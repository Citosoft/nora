import { scanLocalAgentUsage } from "@main/agent-usage/scanLocalAgentUsage";
import type { AgentUsageScanRequest, LocalAgentUsageReport } from "@shared/types/agentUsageStats.types";
import { ipcMain } from "electron";

export function registerAgentUsageIpc(): void {
  ipcMain.handle(
    "app:scan-local-agent-usage",
    async (_event, request: AgentUsageScanRequest): Promise<LocalAgentUsageReport> => scanLocalAgentUsage(request)
  );
}
