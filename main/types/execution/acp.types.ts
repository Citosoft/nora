import type { ClientContext, InitializeResponse, NewSessionResponse, RequestPermissionRequest, RequestPermissionResponse, SessionNotification } from "@agentclientprotocol/sdk";
import type { AcpProviderKind } from "@shared/types/provider/providerKind.types";
import type { ProviderCatalog } from "@shared/types/provider/catalog.types";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { EmitProviderUpdate, ProviderExecution } from "./provider.types";

/** How to start an agent's ACP server, taken from the official ACP agent registry. */
export interface AcpLaunchSpec {
  /** Separate ACP adapter executables; omitted means the agent catalog's own aliases and install paths. */
  executables?: readonly string[];
  args: readonly string[];
  env?: Readonly<Record<string, string>>;
}

export interface AcpOptions {
  kind: AcpProviderKind;
  instanceId: string;
  label: string;
  executable: string;
  args: readonly string[];
  environment?: NodeJS.ProcessEnv;
  now: () => string;
  requestLifetimeMs?: number;
  /** Bounds initialize and session setup; prompts are bounded only by interrupts. */
  setupTimeoutMs?: number;
  catalogTtlMs?: number;
}

/** A running agent process with a completed `initialize` handshake. */
export interface AcpLiveConnection {
  agent: ClientContext;
  init: InitializeResponse;
  closed: Promise<void>;
  close(): void;
}

export interface AcpConnectionHandlers {
  onUpdate(notification: SessionNotification): void;
  onPermission(request: RequestPermissionRequest, signal: AbortSignal): Promise<RequestPermissionResponse>;
  onExit(): void;
}

/** Session setup the agent returned, which drives models, policies and their application. */
export type AcpSessionSetup = Pick<NewSessionResponse, "modes" | "configOptions">;

export interface AcpControlPlan {
  models: ProviderCatalog["models"];
  policies: ProviderCatalog["policies"];
}

/** The ACP calls that apply a conversation's model, reasoning and permission policy to a session. */
export type AcpControlChange =
  | { kind: "mode"; modeId: string }
  | { kind: "config"; configId: string; value: string };

export type AcpControlResolution = { ok: true; changes: AcpControlChange[] } | { ok: false; message: string };

export interface AcpStreamState {
  index: number;
  text: string;
  createdAt: string;
}

export interface AcpTurn {
  execution: ProviderExecution;
  emit: EmitProviderUpdate;
  /** Null until session setup finishes; an interrupt before then cancels the turn without prompting. */
  sessionId: string | null;
  items: Map<string, TimelineItem>;
  message: AcpStreamState | null;
  reasoning: AcpStreamState | null;
  streams: number;
  cancelled: boolean;
}

export type AcpPermissionOutcome = RequestPermissionResponse["outcome"];

export interface AcpPendingPermission {
  attemptId: string;
  optionIds: ReadonlySet<string>;
  resolve(outcome: AcpPermissionOutcome): void;
}
