import type { StatusBarContextValue, UpdateSnapshot } from "@/components/app/types/component.types";
import type { AgentPromptSubmission, AgentSession, AppState, CreateAgentPayload } from "@shared/appTypes";

export type LaunchAgentWithInstructionResult = {
  snapshot: AppState;
  agentId: string;
  createdAgent: AgentSession | null;
};

export type LaunchAgentHandoffOptions = {
  prompt: AgentPromptSubmission;
  statusBar: StatusBarContextValue;
  statusMessage: string;
  updateSnapshot: UpdateSnapshot;
  handoffInstruction?: (options: {
    agentId: string;
    prompt: AgentPromptSubmission;
    updateSnapshot: UpdateSnapshot;
    focusAgent?: (agentId: string) => Promise<void>;
  }) => Promise<void>;
};

export type LaunchAgentOptions = {
  payload: CreateAgentPayload;
  createAgent: (payload: CreateAgentPayload) => Promise<AppState | null>;
  focusAgent?: (agentId: string) => Promise<void>;
  trackCreation?: (payload: CreateAgentPayload) => void;
  onCreated?: (result: LaunchAgentWithInstructionResult) => void | Promise<void>;
  handoff?: LaunchAgentHandoffOptions;
};

export type LaunchAgentWithInstructionOptions = Omit<LaunchAgentOptions, "handoff"> & {
  instruction: string;
  prompt?: Omit<AgentPromptSubmission, "text">;
  handoffStatusMessage: string;
  statusBar: StatusBarContextValue;
  updateSnapshot: UpdateSnapshot;
  handoffInstruction?: LaunchAgentHandoffOptions["handoffInstruction"];
};
