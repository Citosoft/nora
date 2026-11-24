import type { ComposerAttachment, SaveComposerAttachmentPayload } from "@shared/types/agentInput.types";
import type { RuntimeEnvironment } from "@shared/types/remote-access/directory.types";
import type { ExecutionHost } from "@main/execution/host";
import type { InboxService } from "@main/types/inbox/inbox.types";
import type { PersonalizationBridge, NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { RemoteIdentity, RemoteTokenVerifier } from "../auth.types";
import type { RemotePresenceRecorder } from "../presence.types";
import type { RemoteAuditEntry } from "@shared/types/remote-access/remoteAccess.types";
import type { RuntimeApiErrorCode, RealtimeServerMessage } from "@shared/types/remote-access/runtimeApi.types";

export type RemoteExecutionHost = Pick<ExecutionHost, "environmentId" | "execute" | "catalog" | "header" | "summaries" | "history" | "conversationHistory" | "eventCursor" | "subscribe">;
export interface RuntimeApiOptions {
  host: RemoteExecutionHost;
  inbox: Pick<InboxService, "snapshot" | "execute">;
  boot(): NativeBoot;
  management?: Pick<PersonalizationBridge, "request">;
  attachments?: { save(payload: SaveComposerAttachmentPayload): Promise<ComposerAttachment> };
  runtimeVersion: string;
  environment: RuntimeEnvironment;
  name(): string;
  origins: readonly string[];
  verifier: RemoteTokenVerifier;
  /** Rejects after disable, sign-out, account switch or shutdown, including after an awaited authentication. */
  permits(identity: RemoteIdentity): boolean;
  record(entry: RemoteAuditEntry): void;
  /** Notes which signed-in devices reach this computer, for the desktop's device list. */
  presence: RemotePresenceRecorder;
  now(): number;
}
export interface RuntimeFailureDescription { code: RuntimeApiErrorCode; status: number; message: string; }
export interface RuntimeTicket { identity: RemoteIdentity; expiresAt: number; }
export interface RealtimeTickets {
  issue(identity: RemoteIdentity): { ticket: string; expiresAt: string };
  consume(ticket: string): RemoteIdentity | null;
  clear(): void;
}
export interface RuntimeApi {
  handle(request: Request): Promise<Response>;
  tickets: RealtimeTickets;
}
export interface RealtimePeer {
  send(message: RealtimeServerMessage): boolean;
  close(code: number): void;
  onMessage(listener: (text: string) => void): void;
  onClose(listener: () => void): void;
}
export interface RuntimeServer {
  port: number;
  close(): Promise<void>;
}
export interface RuntimeServerOptions extends RuntimeApiOptions {
  port: number | null;
  hostname(): string | null;
}
