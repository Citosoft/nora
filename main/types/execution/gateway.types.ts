import type { ConversationCursorHint, ConversationGatewayReply, ConversationWatchReceipt } from "@shared/ipc/types/conversationGateway.types";
import type { ExecutionHost } from "@main/execution/host";
import type { McpAppFrameServer } from "./mcpApp.types";

export type ConversationHost = Pick<ExecutionHost, "reference" | "externalSessions" | "environmentId" | "execute" | "header" | "context" | "summaries" | "conversationHistory" | "history" | "catalog" | "mcp" | "mcpApp" | "account" | "skills" | "subscribe" | "eventCursor">;
export type ConversationReplyValue = Extract<ConversationGatewayReply, { ok: true }>["value"];
export interface GatewayDependencies { resolveHost: (environmentId: string) => ConversationHost | null }
export interface WatchHandle { receipt: ConversationWatchReceipt; cancel: () => void }
export interface ConversationSubscriber {
  id: number;
  isDestroyed(): boolean;
  send(channel: string, payload: ConversationCursorHint): void;
  once(event: "destroyed" | "render-process-gone", listener: () => void): void;
  /** Fires for every frame in the window, widget iframes included; `isMainFrame` tells the window's own navigations apart. */
  on(event: "did-start-navigation", listener: (details: { isMainFrame: boolean }) => void): void;
  removeListener(event: "destroyed" | "render-process-gone", listener: () => void): void;
  removeListener(event: "did-start-navigation", listener: (details: { isMainFrame: boolean }) => void): void;
}
export interface ConversationInvocation { sender: ConversationSubscriber; senderFrame?: { url: string } | null }
export interface ConversationIpc {
  handle(channel: string, listener: (event: ConversationInvocation, payload: unknown) => Promise<ConversationGatewayReply>): void;
  removeHandler(channel: string): void;
}
export interface RegisterConversationDeps extends GatewayDependencies {
  ipc: ConversationIpc;
  /** Serves widget documents the host returns, so widget HTML never reaches the renderer. */
  mcpAppFrames: Pick<McpAppFrameServer, "register">;
  isAllowedSender: (event: ConversationInvocation) => boolean;
}
export interface WatchSession extends WatchHandle {
  fingerprint: string;
}
export interface WindowSubscriptions {
  sender: ConversationSubscriber;
  watches: Map<string, WatchSession>;
  onClosed: () => void;
  onNavigation: (details: { isMainFrame: boolean }) => void;
}
