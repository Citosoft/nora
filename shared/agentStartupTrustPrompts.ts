export function stripAgentTerminalAnsi(output: string): string {
  return output.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

export function normalizeAgentTerminalPlainText(output: string): string {
  return stripAgentTerminalAnsi(output).replace(/\s+/g, " ");
}

export type AgentStartupPromptDismissal = {
  inputs: string[];
};

export type AgentStartupPromptDismissalState = {
  acceptedTrustPrompt: boolean;
  acceptedModelPrompt: boolean;
  acceptedContinuePrompt: boolean;
  acceptedGenericTrustPrompt: boolean;
};

export function createAgentStartupPromptDismissalState(): AgentStartupPromptDismissalState {
  return {
    acceptedTrustPrompt: false,
    acceptedModelPrompt: false,
    acceptedContinuePrompt: false,
    acceptedGenericTrustPrompt: false
  };
}

export function resolvePendingAgentStartupPromptDismissal(
  plainOutput: string,
  state: AgentStartupPromptDismissalState
): AgentStartupPromptDismissal | null {
  if (!state.acceptedTrustPrompt && plainOutput.includes("Do you trust the contents of this directory?")) {
    state.acceptedTrustPrompt = true;
    return { inputs: ["1", "\r"] };
  }

  if (!state.acceptedModelPrompt && plainOutput.includes("Choose how you'd like Codex to proceed.")) {
    state.acceptedModelPrompt = true;
    return { inputs: ["1", "\r"] };
  }

  if (!state.acceptedContinuePrompt && plainOutput.includes("Press enter to continue")) {
    state.acceptedContinuePrompt = true;
    return { inputs: ["\r"] };
  }

  const hasGenericTrustPrompt =
    (/quick safety check/i.test(plainOutput) && /trust/i.test(plainOutput)) ||
    /trust the authors/i.test(plainOutput) ||
    (/do you trust/i.test(plainOutput) && !plainOutput.includes("Do you trust the contents of this directory?"));

  if (!state.acceptedGenericTrustPrompt && hasGenericTrustPrompt) {
    state.acceptedGenericTrustPrompt = true;
    return { inputs: ["\r"] };
  }

  return null;
}

export function hasPendingAgentStartupPrompt(
  plainOutput: string,
  state: AgentStartupPromptDismissalState
): boolean {
  return resolvePendingAgentStartupPromptDismissal(plainOutput, state) !== null;
}
