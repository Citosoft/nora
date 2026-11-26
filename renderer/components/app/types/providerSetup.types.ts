import type { AgentCatalogEntry } from "@shared/appTypes";

/** What a thread needs from the shell to guide setting up a first provider. */
export interface ProviderSetupPorts {
  agentCatalog: readonly AgentCatalogEntry[];
  /** Rescans the machine for supported agent CLIs. */
  refreshAgentCatalog(): Promise<void>;
  openProviderSettings(): void;
}

export type ProviderSetupStepId = "install" | "connect" | "sign-in";
/** `checking` marks the step Nora is verifying right now. Sign-in needs a connected runtime, so it is always still ahead here. */
export type ProviderSetupStepState = "done" | "current" | "pending" | "checking";

export interface ProviderSetupStep {
  id: ProviderSetupStepId;
  state: ProviderSetupStepState;
}

export interface ProviderSetupStepsInput {
  /** Supported agents Nora can run that are installed on this machine. */
  installedAgentIds: readonly string[];
  /** True while Nora rescans agents or connects detected ones. */
  checking: boolean;
}

export interface ProviderSetupPanelProps {
  /** Null where the thread is hosted outside the session center, which has no Settings to open. */
  setup: ProviderSetupPorts | null;
  visible: boolean;
  /** A new thread's panel lets the backdrop show through, matching its composer. */
  translucent: boolean;
}

export interface ProviderSetupStepMarkerProps {
  step: ProviderSetupStep;
  index: number;
}
