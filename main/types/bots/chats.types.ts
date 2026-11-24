import type { BotAuthor, BotDefinition, BotSnapshot, ChatBotProfile, DirectDescriptor } from "@shared/types/bots/bots.types";
import type { ContextUsage, Conversation, ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { BotConversationHost, BotRunnerDeps, BotThreadOptions } from "./conversations.types";
import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { ChatBranchNameReply, ChatBranchReply, ChatBranchRequest } from "@shared/ipc/types/chatBranchGateway.types";
import type { DirectContextPreview, DirectContextReply, DirectContextRequest } from "@shared/ipc/types/directContextGateway.types";
import type { NoraRunContextPreview, RunContextSubject } from "@main/types/nora-tools/noraTools.types";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";

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
export type DirectRoute = { kind: "continue"; threadId: string } | { kind: "new"; workspaceId: string; title: string; done: string | null };
export type DirectRouter = (input: DirectRouteInput) => Promise<DirectRoute | null>;
/** The router's request, exactly as it is sent to the simple AI tasks model. */
export interface DirectRouterPrompt { system: string; user: string; }
/** What starting a direct chat's work thread needs: configured bots by workspace, and the binding Nora's chat runs on there. */
export interface DirectWorkerDeps extends BotRunnerDeps {
  bot(workspaceId: string, botId: string): BotDefinition | null;
  noraBinding(workspace: WorkspaceRef): Promise<ProviderBinding>;
}
/** A direct chat's bot in one workspace: who it is, and how it starts a work thread there. */
export interface DirectWorker {
  profile: ChatBotProfile;
  start(parent: Conversation, workspace: WorkspaceRef, title: string, options?: BotThreadOptions): Promise<string>;
}
export interface DirectCoordinatorOptions extends DirectWorkerDeps {
  now(): string;
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
export interface ChatBranchDeps extends DirectWorkerDeps {
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
  /** Null for Nora's chat, whose work threads are ordinary Nora threads. */
  bot: BotSnapshot | null;
  /** Null when Nora's chat has no saved model and will use the first available one. */
  provider: Pick<ProviderBinding, "kind" | "model"> | null;
  subject: RunContextSubject;
  lastRequest: ContextUsage | null;
}
/** What previewing a direct chat's next request reads; nothing here runs a model, creates a thread or freezes notes. */
export interface DirectContextPreviewDeps {
  host: Pick<BotConversationHost, "header" | "summaries" | "conversationHistory">;
  bot(workspaceId: string, botId: string): BotDefinition | null;
  /** The model Nora's chat starts new work threads on, or null for the first available one. */
  noraModel(): ThreadModelDefault | null;
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
