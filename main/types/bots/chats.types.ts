import type { BotAuthor, BotDefinition, DirectDescriptor } from "@shared/types/bots/bots.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { BotConversationHost } from "./conversations.types";

/** What a coordinator can post into its chat during one run. */
export interface ChatRunOutput {
  milestone(text: string): void;
  reply(author: BotAuthor, text: string, workThreadId: string): void;
  finish(status: "completed" | "interrupted" | "failed", message?: string): void;
}
/** A workspace a direct chat may start work in. */
export interface ChatWorkspace { id: string; name: string; workspace: WorkspaceRef; }
/** An open work thread a direct chat can continue. */
export interface DirectWorkThread { id: string; title: string; workspaceId: string; workspaceName: string; updatedAt: string; }
export interface DirectRouteInput {
  message: string;
  bot: Pick<DirectDescriptor, "name" | "role">;
  /** Recent chat messages, oldest first, for context. */
  recent: string;
  threads: readonly DirectWorkThread[];
  workspaces: readonly Pick<ChatWorkspace, "id" | "name">[];
  defaultWorkspaceId: string;
  signal: AbortSignal;
}
/** Where a direct-chat message goes: an open work thread, or a new one in a workspace. */
export type DirectRoute = { kind: "continue"; threadId: string } | { kind: "new"; workspaceId: string; title: string };
export type DirectRouter = (input: DirectRouteInput) => Promise<DirectRoute | null>;
export interface DirectCoordinatorOptions {
  host: BotConversationHost;
  nextId(): string;
  now(): string;
  bot(workspaceId: string, botId: string): BotDefinition | null;
  /** Workspaces registered on this host. */
  workspaces(): readonly ChatWorkspace[];
  route: DirectRouter;
  replyTimeoutMs?: number;
}
export interface DirectRoutingInput {
  route: DirectRoute | null;
  message: string;
  threads: readonly DirectWorkThread[];
  workspaces: readonly Pick<ChatWorkspace, "id">[];
  defaultWorkspaceId: string;
}
