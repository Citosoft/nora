const LAUNCH_PROMPT_TOOL_IDS = new Set(["codex", "claude", "gemini"]);
const WORKSPACE_TRUST_TOOL_IDS = new Set(["gemini"]);

export type AgentInitialPromptDelivery = "terminal" | "launch-command";
export type AgentStartupTrustMode = "default" | "trusted-workspace";

export function canPresetAgentInitialPrompt(toolId: string): boolean {
  return LAUNCH_PROMPT_TOOL_IDS.has(toolId);
}

export function canPresetAgentWorkspaceTrust(toolId: string): boolean {
  return WORKSPACE_TRUST_TOOL_IDS.has(toolId);
}
