import type { ConversationCursorHint, ConversationGatewayReply, ConversationWatchReceipt } from "@shared/ipc/types/conversationGateway.types";
import type { ExecutionHost } from "@main/execution/host";

export type ConversationHost = Pick<ExecutionHost, "environmentId" | "execute" | "header" | "summaries" | "conversationHistory" | "history" | "catalog" | "mcp" | "subscribe" | "eventCursor">;
export interface GatewayDependencies { resolveHost: (environmentId: string) => ConversationHost | null }
export interface WatchHandle { receipt: ConversationWatchReceipt; cancel: () => void }
export interface ConversationSubscriber {
  id: number;
  isDestroyed(): boolean;
  send(channel: string, payload: ConversationCursorHint): void;
  once(event: "destroyed" | "did-start-navigation" | "render-process-gone", listener: () => void): void;
  removeListener(event: "destroyed" | "did-start-navigation" | "render-process-gone", listener: () => void): void;
}
export interface ConversationInvocation { sender: ConversationSubscriber; senderFrame?: { url: string } | null }
export interface ConversationIpc {
  handle(channel: string, listener: (event: ConversationInvocation, payload: unknown) => Promise<ConversationGatewayReply>): void;
  removeHandler(channel: string): void;
}
export interface RegisterConversationDeps extends GatewayDependencies {
  ipc: ConversationIpc;
  isAllowedSender: (event: ConversationInvocation) => boolean;
}
export interface WatchSession extends WatchHandle {
  fingerprint: string;
}
export interface WindowSubscriptions {
  sender: ConversationSubscriber;
  watches: Map<string, WatchSession>;
  onClosed: () => void;
}
