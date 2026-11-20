import type { RunMcpServer } from "@main/types/nora-tools/noraTools.types";
import type { ThreadToolScope } from "@main/types/execution/toolScope.types";
import { readWorkerSandbox } from "./readWorkerSandbox";
import { claudeMcpServersConfig } from "./runMcpServers";
import type { Options } from "@anthropic-ai/claude-agent-sdk";

const INSPECTION_TOOLS = ["Read", "Glob", "Grep", "AskUserQuestion"];
/** Everything an app's builder does goes through Nora's app tools and the app's connectors, so the only built-in it keeps is the question dialog. */
const BUILDER_TOOLS = ["AskUserQuestion"];

export function isClaudeInspectionTool(name: string): boolean { return INSPECTION_TOOLS.includes(name) || name === "mcp__nora__report_workflow_stage"; }

/** Whether a scoped thread may call a built-in or MCP tool at all; the normal approval flow still applies to what passes. */
export function claudeToolAllowed(scope: ThreadToolScope, name: string): boolean {
  switch (scope) {
    case "full": return true;
    case "inspect": return isClaudeInspectionTool(name);
    case "read-worker": return INSPECTION_TOOLS.includes(name) || name === "Bash";
    case "apps": return BUILDER_TOOLS.includes(name) || name.startsWith("mcp__");
  }
}

/** The SDK options a scope needs: narrowed built-ins and, outside a working thread, no tool source beyond the run's own servers (not even the user's global MCP config). */
export function claudeToolScopeOptions(scope: ThreadToolScope, servers: readonly RunMcpServer[] = [], cwd?: string): Pick<Options, "tools" | "mcpServers" | "strictMcpConfig" | "allowedTools" | "sandbox" | "settingSources" | "managedSettings"> {
  switch (scope) {
    case "full": return claudeMcpServersConfig(servers);
    case "inspect": return { tools: [...INSPECTION_TOOLS], mcpServers: {}, strictMcpConfig: true, ...claudeMcpServersConfig(servers) };
    case "read-worker": {
      if (!cwd) throw new Error("A read-only worker needs a checkout path for its sandbox.");
      const sandbox = readWorkerSandbox(cwd);
      return { tools: [...INSPECTION_TOOLS, "Bash"], mcpServers: {}, strictMcpConfig: true,
        settingSources: [], sandbox, managedSettings: { sandbox } };
    }
    case "apps": return { tools: [...BUILDER_TOOLS], mcpServers: {}, strictMcpConfig: true, ...claudeMcpServersConfig(servers) };
  }
}
