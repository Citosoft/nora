const LAUNCH_PROMPT_TOOL_IDS = new Set(["codex", "claude"]);

export type AgentInitialPromptDelivery = "terminal" | "launch-command";

export type ManagedAgentLaunchOptions = {
  initialPromptDelivery: AgentInitialPromptDelivery;
};

export function canPresetAgentInitialPrompt(toolId: string): boolean {
  return LAUNCH_PROMPT_TOOL_IDS.has(toolId);
}

export function resolveManagedAgentLaunchOptions(toolId: string): ManagedAgentLaunchOptions {
  return { initialPromptDelivery: canPresetAgentInitialPrompt(toolId) ? "launch-command" : "terminal" };
}
