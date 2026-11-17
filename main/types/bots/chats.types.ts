import type { BotAuthor, BotDefinition, BotSnapshot, DirectDescriptor } from "@shared/types/bots/bots.types";
import type { ContextUsage, ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { BotConversationHost } from "./conversations.types";
import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { ChatBranchNameReply, ChatBranchReply, ChatBranchRequest } from "@shared/ipc/types/chatBranchGateway.types";
import type { DirectContextPreview, DirectContextReply, DirectContextRequest } from "@shared/ipc/types/directContextGateway.types";
import type { NoraRunContextPreview, RunContextSubject } from "@main/types/nora-tools/noraTools.types";

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
/** The workspaces a direct-chat message may work in and the one it works in by default. */
export interface DirectPlacement { workspaces: ChatWorkspace[]; defaultWorkspaceId: string; }
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
/** The router's request, exactly as it is sent to the simple AI tasks model. */
export interface DirectRouterPrompt { system: string; user: string; }
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
/** What starting a chat branch needs: the host, the bots and workspaces it may resolve, and ids for anything it creates itself. */
export interface ChatBranchDeps {
  host: BotConversationHost;
  nextId(): string;
  bot(workspaceId: string, botId: string): BotDefinition | null;
  workspaces(): readonly ChatWorkspace[];
  /** Generates a branch name with the simple AI tasks model. */
  name(message: string): Promise<string>;
}
/** Where a branch runs and with which access, resolved from its chat. */
export interface ChatBranchPlacement { workspace: WorkspaceRef; workspaceId: string; }
export interface ChatBranchIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input: unknown) => Promise<ChatBranchReply | ChatBranchNameReply>): void;
    removeHandler(channel: string): void;
  };
  start(request: ChatBranchRequest): Promise<string>;
  name(message: string): Promise<string>;
  isAllowedSender(event: ConversationInvocation): boolean;
}
/** The work thread a context preview describes: who answers there, on which model, and what the provider last measured. */
export interface DirectPreviewThread {
  id: string;
  workspaceName: string;
  bot: BotSnapshot;
  provider: Pick<ProviderBinding, "kind" | "model">;
  subject: RunContextSubject;
  lastRequest: ContextUsage | null;
}
/** What previewing a direct chat's next request reads; nothing here runs a model, creates a thread or freezes notes. */
export interface DirectContextPreviewDeps {
  host: Pick<BotConversationHost, "header" | "summaries" | "conversationHistory">;
  bot(workspaceId: string, botId: string): BotDefinition | null;
  workspaces(): readonly ChatWorkspace[];
  runContext(subject: RunContextSubject): NoraRunContextPreview;
  /** The simple AI tasks model the router runs on. */
  routerModel(): string;
  now(): string;
}
export interface DirectContextIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input: unknown) => Promise<DirectContextReply>): void;
    removeHandler(channel: string): void;
  };
  preview(request: DirectContextRequest): DirectContextPreview;
  isAllowedSender(event: ConversationInvocation): boolean;
}
