import type { ConversationEvent } from "@shared/types/conversation/contracts.types";
import type { RuntimeInfo } from "@shared/types/remote-access/runtimeApi.types";
import type { LoadState } from "./loadState.types";
import type { RealtimeConnection, RealtimeDeps, RealtimeListener, RealtimeStatus } from "./realtime.types";
import type { RuntimeClient } from "./runtimeClient.types";

export type RuntimeCompatibility = { compatible: true; message: null } | { compatible: false; message: string };

/** Whether a feature is usable on this runtime, with the reason shown in place of the control when it is not. */
export type CapabilityGate = { enabled: true; reason: null } | { enabled: false; reason: string };

export interface RuntimeSessionSnapshot {
  info: LoadState<RuntimeInfo>;
  compatibility: RuntimeCompatibility | null;
  connection: RealtimeStatus;
  /** False when the runtime lacks the `realtime` capability: screens refresh on demand instead. */
  liveUpdates: boolean;
}

export type SessionEventsListener = (events: readonly ConversationEvent[]) => void;
/** Reloads state after the runtime dropped events this client still needed. */
export type SessionResetListener = () => Promise<void>;

/** One connected runtime: its client, capability handshake and realtime stream, shared by every screen that shows it. */
export interface RuntimeSession {
  readonly runtimeId: string;
  readonly hostname: string;
  readonly client: RuntimeClient;
  getSnapshot(): RuntimeSessionSnapshot;
  subscribe(listener: () => void): () => void;
  onEvents(listener: SessionEventsListener): () => void;
  onReset(listener: SessionResetListener): () => void;
  start(): void;
  /** Reloads runtime info and reconnects, e.g. after the user taps "Try again". */
  retry(): void;
  resume(): void;
  dispose(): void;
}

export interface RuntimeSessionDeps {
  runtimeId: string;
  hostname: string;
  client: RuntimeClient;
  createConnection: (deps: Pick<RealtimeDeps, "requestTicket" | "fetchEvents" | "socketUrl">, listener: RealtimeListener) => RealtimeConnection;
  /** Called whenever an authenticated request to the runtime succeeded, to remember "last connected". */
  onConnected: (at: Date) => void;
  now: () => Date;
}

export interface RuntimeEndpoint {
  installationId: string;
  hostname: string;
}

export interface RuntimeSessionRegistry {
  /** The live session for a runtime, created on first use and replaced if its hostname changed. */
  get(endpoint: RuntimeEndpoint): RuntimeSession;
  resumeAll(): void;
  disposeAll(): void;
}

export type RuntimeSessionLookup =
  | { status: "loading" }
  | { status: "not-found"; message: string }
  | { status: "ready"; session: RuntimeSession; snapshot: RuntimeSessionSnapshot; name: string };

/** A resolved runtime as screens receive it. */
export interface ConnectedRuntime {
  session: RuntimeSession;
  snapshot: RuntimeSessionSnapshot;
  name: string;
}

export interface SessionResourceOptions {
  /** Changing the key reloads from scratch (e.g. a different project filter). */
  key: string;
  /** Which realtime events make the resource stale; matching bursts are debounced into one reload. */
  isAffectedBy: (events: readonly ConversationEvent[]) => boolean;
  debounceMs?: number;
}
