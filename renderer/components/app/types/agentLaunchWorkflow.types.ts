import type { StatusBarContextValue, UpdateSnapshot } from "@/components/app/types/component.types";
import type { AgentSession, AppState, CreateAgentPayload } from "@shared/appTypes";

export type LaunchAgentWithInstructionResult = {
  snapshot: AppState;
  agentId: string;
  createdAgent: AgentSession | null;
};

export type LaunchAgentHandoffOptions = {
  instruction: string;
  statusBar: StatusBarContextValue;
  statusMessage: string;
  updateSnapshot: UpdateSnapshot;
  handoffInstruction?: (options: {
    agentId: string;
    instruction: string;
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
  handoffStatusMessage: string;
  statusBar: StatusBarContextValue;
  updateSnapshot: UpdateSnapshot;
  handoffInstruction?: LaunchAgentHandoffOptions["handoffInstruction"];
};
