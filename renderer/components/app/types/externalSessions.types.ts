import type { ThreadSourceFilter, ThreadSort } from "./thread-workspace/list.types";
import type { ExternalSession } from "@shared/types/conversation/externalSessions.types";
import type { ThreadNavigationPorts } from "./thread-workspace/ports.types";
import type { ConversationClient } from "./conversationClient.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";

export interface ExternalSessionEntry { session: ExternalSession; workspaceId: string; workspaceName: string; workspacePath: string; }
export interface ExternalDiscoveryState { entries: ExternalSessionEntry[]; loading: boolean; errors: string[]; }
export interface ExternalSessionsInput { ports: ThreadNavigationPorts; workspaceId: string | null; enabled?: boolean; }

/** One workspace scanned for one provider account's sessions. */
export interface ExternalDiscoveryTarget {
  workspace: Pick<NativeWorkspace, "id" | "name" | "workspace">;
  provider: { kind: ProviderBinding["kind"]; instanceId: string };
}
export interface ExternalDiscoveryStoreDeps { client: Pick<ConversationClient, "externalSessions">; }
/** Window-lifetime cache of sessions found outside Nora; it only scans on request. */
export interface ExternalDiscoveryStore {
  subscribe(listener: () => void): () => void;
  snapshot(): ExternalDiscoveryState;
  /** Scans targets that have never been scanned; already-scanned targets keep their results. */
  ensure(targets: readonly ExternalDiscoveryTarget[]): void;
  /** Rescans the targets, keeping their current results visible until the new ones arrive. */
  refresh(targets: readonly ExternalDiscoveryTarget[]): void;
}

export interface ExternalListInput { entries: readonly ExternalSessionEntry[]; query: string; sourceFilter?: ThreadSourceFilter; sort?: ThreadSort; }

export interface ResumableThreadsInput extends ExternalSessionsInput { query: string; sourceFilter: ThreadSourceFilter; sort: ThreadSort; }
export interface ExternalThreadControlsState {
  loading: boolean;
  busy: boolean;
  errors: string[];
  refresh(): void;
}
/** Discovery status shown under the list; the refresh button lives in the thread toolbar. */
export interface ExternalThreadControlsProps { state: Pick<ExternalThreadControlsState, "loading" | "errors">; }
