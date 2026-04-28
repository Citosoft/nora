import { handoffInstructionToAgent } from "@/components/app/logic/agentHandoff";
import type {
  LaunchAgentOptions,
  LaunchAgentWithInstructionOptions,
  LaunchAgentWithInstructionResult
} from "@/components/app/types/agentLaunchWorkflow.types";

export async function launchAgent(
  options: LaunchAgentOptions
): Promise<LaunchAgentWithInstructionResult | null> {
  const next = await options.createAgent(options.payload);
  const agentId = next?.focusedAgentId;
  if (!next || !agentId) {
    return null;
  }

  const result: LaunchAgentWithInstructionResult = {
    snapshot: next,
    agentId,
    createdAgent: next.agents.find((entry) => entry.id === agentId) ?? null
  };

  options.trackCreation?.(options.payload);
  await options.onCreated?.(result);

  if (options.handoff) {
    const statusId = options.handoff.statusBar.beginStatus(options.handoff.statusMessage, true);
    try {
      await (options.handoff.handoffInstruction ?? handoffInstructionToAgent)({
        agentId,
        instruction: options.handoff.instruction,
        updateSnapshot: options.handoff.updateSnapshot,
        focusAgent: options.focusAgent
      });
    } finally {
      options.handoff.statusBar.endStatus(statusId);
    }
  }

  return result;
}

export async function launchAgentWithInstruction(
  options: LaunchAgentWithInstructionOptions
): Promise<LaunchAgentWithInstructionResult | null> {
  return launchAgent({
    payload: options.payload,
    createAgent: options.createAgent,
    focusAgent: options.focusAgent,
    trackCreation: options.trackCreation,
    onCreated: options.onCreated,
    handoff: {
      instruction: options.instruction,
      statusBar: options.statusBar,
      statusMessage: options.handoffStatusMessage,
      updateSnapshot: options.updateSnapshot,
      handoffInstruction: options.handoffInstruction
    }
  });
}
