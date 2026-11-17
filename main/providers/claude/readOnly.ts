import type { RunMcpServer } from "@main/types/nora-tools/noraTools.types";
import { claudeMcpServersConfig } from "./runMcpServers";
import type { Options } from "@anthropic-ai/claude-agent-sdk";

const INSPECTION_TOOLS = ["Read", "Glob", "Grep", "AskUserQuestion"];
export function isClaudeInspectionTool(name: string): boolean { return INSPECTION_TOOLS.includes(name) || name === "mcp__nora__report_workflow_stage"; }

/** Remove code execution and every external tool source, including the user's global MCP configuration. */
export function claudeReadOnlyOptions(servers: readonly RunMcpServer[] = []): Pick<Options, "tools" | "mcpServers" | "strictMcpConfig" | "allowedTools"> {
  return { tools: [...INSPECTION_TOOLS], mcpServers: {}, strictMcpConfig: true, ...claudeMcpServersConfig(servers) };
}
