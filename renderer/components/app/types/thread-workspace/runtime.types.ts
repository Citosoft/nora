import type { GroupRequest } from "@shared/types/bots/bots.types";
import type { ConversationSource, ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { AgentContextSelection } from "@shared/appTypes";
import type { ReactNode } from "react";
import type { NativeBoot, PersonalizationRequest } from "@shared/ipc/types/personalizationGateway.types";
import type { ThreadWorkspaceStore } from "./state.types";
import type { InboxStore } from "../inbox.types";

/** `provider` runs the new thread on a chosen binding instead of the workspace's default. */
export interface ThreadLaunchInput { submit?: boolean; source?: ConversationSource; projectId?: string; worktreeId?: string; text?: string; contextSelections?: readonly AgentContextSelection[]; group?: GroupRequest; provider?: ProviderBinding; }
export interface NativeRuntimePorts {
  store: ThreadWorkspaceStore;
  inbox: InboxStore;
  boot: NativeBoot;
  launch(input?: ThreadLaunchInput): Promise<string | null>;
  request(input: PersonalizationRequest): Promise<NativeBoot>;
}
export interface NativeRuntimeProviderProps { children: ReactNode; }
