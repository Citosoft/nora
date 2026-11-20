import type { z } from "zod";
import type { CommandReceipt } from "@shared/types/conversation/contracts.types";
import type { RemoteRequestError } from "@/api/http/remoteRequestError";
import type { pendingCommandSchema } from "@/commands/pendingCommandSchema";

/**
 * A command whose IDs were generated and saved before it was sent, so a retry after a lost reply reuses them and the
 * runtime returns the original receipt instead of acting twice.
 */
export type PendingCommand = z.infer<typeof pendingCommandSchema>;
export type PendingCommandKind = PendingCommand["kind"];
export type PendingSendMessage = Extract<PendingCommand, { kind: "send-message" }>;
export type PendingCreateConversation = Extract<PendingCommand, { kind: "create-conversation" }>;
export type PendingCreateBotChat = Extract<PendingCommand, { kind: "create-bot-chat" }>;
export type PendingDecideAction = Extract<PendingCommand, { kind: "decide-action" }>;
export type PendingCancelTask = Extract<PendingCommand, { kind: "cancel-task" }>;

export type CommandOutcome =
  | { status: "accepted"; receipt: CommandReceipt }
  /** The runtime definitively refused it; the saved command was discarded. */
  | { status: "rejected"; error: RemoteRequestError }
  /** The reply was lost or the runtime was unreachable; the saved command is kept for a retry with the same IDs. */
  | { status: "uncertain"; error: RemoteRequestError };

export type PendingCommandListener = (commands: readonly PendingCommand[]) => void;

export interface PendingCommandStore {
  load(): Promise<void>;
  list(): readonly PendingCommand[];
  get(key: string): PendingCommand | undefined;
  /** Persists before resolving, so the command survives a reload that happens while it is in flight. */
  put(command: PendingCommand): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  subscribe(listener: PendingCommandListener): () => void;
}

/** Inputs for building commands, injected so IDs and timestamps are deterministic in tests. */
export interface CommandFactoryDeps {
  createId: () => string;
  now: () => Date;
}

export interface CommandRunner {
  /** Saved commands for this runtime that have not been confirmed yet. */
  pending: readonly PendingCommand[];
  inFlight: ReadonlySet<string>;
  run(command: PendingCommand): Promise<CommandOutcome>;
  retry(key: string): Promise<CommandOutcome | null>;
  discard(key: string): Promise<void>;
}
