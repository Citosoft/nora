const LAUNCH_PROMPT_TOOL_IDS = new Set(["codex", "claude", "gemini"]);
const WORKSPACE_TRUST_TOOL_IDS = new Set(["gemini"]);

export type AgentInitialPromptDelivery = "terminal" | "launch-command";
export type AgentStartupTrustMode = "default" | "trusted-workspace";

export type ManagedAgentLaunchOptions = {
  initialPromptDelivery: AgentInitialPromptDelivery;
  startupTrustMode: AgentStartupTrustMode;
};

export function canPresetAgentInitialPrompt(toolId: string): boolean {
  return LAUNCH_PROMPT_TOOL_IDS.has(toolId);
}

export function canPresetAgentWorkspaceTrust(toolId: string): boolean {
  return WORKSPACE_TRUST_TOOL_IDS.has(toolId);
}

export function resolveManagedAgentLaunchOptions(toolId: string): ManagedAgentLaunchOptions {
  return {
    initialPromptDelivery: canPresetAgentInitialPrompt(toolId) ? "launch-command" : "terminal",
    startupTrustMode: canPresetAgentWorkspaceTrust(toolId) ? "trusted-workspace" : "default"
  };
}
