import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { RoleSelection } from "@shared/types/personalization/roles.types";
import type { BotSnapshot, DirectDescriptor, GroupDescriptor } from "@shared/types/bots/bots.types";
import type { ExternalTranscript } from "./externalSessions.types";
import type { PreparedProviderTransition } from "./providerTransition.types";

/** Inputs the host resolves before admitting a command; they shape decisions but are not part of command identity. */
export interface PreparedCommand {
  workspace?: WorkspaceRef;
  role?: RoleSelection | null;
  bot?: BotSnapshot;
  group?: GroupDescriptor;
  direct?: DirectDescriptor;
  externalTranscript?: ExternalTranscript;
  steerFollowUp?: boolean;
  providerTransition?: PreparedProviderTransition;
}
