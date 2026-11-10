import type { ConversationSource } from "@shared/types/conversation/contracts.types";
import type { AgentContextSelection } from "@shared/appTypes";
import type { ReactNode } from "react";
import type { NativeBoot, PersonalizationRequest } from "@shared/ipc/types/personalizationGateway.types";
import type { ThreadWorkspaceStore } from "./state.types";

export interface ThreadLaunchInput { source?: ConversationSource; projectId?: string; worktreeId?: string; text?: string; contextSelections?: readonly AgentContextSelection[]; }
export interface NativeRuntimePorts {
  store: ThreadWorkspaceStore;
  boot: NativeBoot;
  launch(input?: ThreadLaunchInput): Promise<string | null>;
  request(input: PersonalizationRequest): Promise<NativeBoot>;
}
export interface NativeRuntimeProviderProps { children: ReactNode; }
