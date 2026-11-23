import type { ThreadSourceFilter, ThreadSort } from "./thread-workspace/list.types";
import type { ExternalSession } from "@shared/types/conversation/externalSessions.types";
import type { ThreadNavigationPorts } from "./thread-workspace/ports.types";

export interface ExternalSessionEntry { session: ExternalSession; workspaceId: string; workspaceName: string; workspacePath: string; }
export interface ExternalDiscoveryState { entries: ExternalSessionEntry[]; loading: boolean; errors: string[]; }
export interface ExternalSessionsInput { ports: ThreadNavigationPorts; workspaceId: string | null; enabled?: boolean; }

export interface ExternalListInput { entries: readonly ExternalSessionEntry[]; query: string; sourceFilter?: ThreadSourceFilter; sort?: ThreadSort; }

export interface ResumableThreadsInput extends ExternalSessionsInput { query: string; sourceFilter: ThreadSourceFilter; sort: ThreadSort; }
export interface ExternalThreadControlsState {
  loading: boolean;
  busy: boolean;
  errors: string[];
  refresh(): void;
}
export interface ExternalThreadControlsProps { state: ExternalThreadControlsState; }
