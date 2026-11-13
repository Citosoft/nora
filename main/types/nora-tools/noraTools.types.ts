import type { AgentSettings, AgentSettingsPatch } from "@shared/types/nora-tools/settings.types";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { NoraToolAudience } from "@shared/types/nora-tools/noraTools.types";
import type { BotMemoryEntry, BotAvatarEyes, BotAvatarPalette, BotAvatarShape, BotDefinition, EffectiveBot } from "@shared/types/bots/bots.types";

/** Where a runtime reaches Nora's own tools for one conversation; the token identifies that conversation. */
export interface NoraToolEndpoint { url: string; token: string; }
/** Null for conversations that do not get Nora's tools (group chats, which run on Nora's coordinator). */
export type NoraToolEndpointResolver = (conversation: Conversation) => Promise<NoraToolEndpoint | null>;
/** Per-run additions for a conversation: Nora's tool endpoint and guidance that changes between runs, such as a bot's saved notes. */
export interface NoraRunContext { tools: NoraToolEndpoint | null; guidance: string | null; }
export type NoraRunContextResolver = (conversation: Conversation) => Promise<NoraRunContext>;
/** The calling thread and which tool set it gets; `group` is the group chat a member thread answers in. */
export interface NoraToolContext { conversation: Conversation; audience: Exclude<NoraToolAudience, "member">; group?: Conversation; }

export interface BotModelInput { provider?: string; model?: string; }
export interface BotAvatarInput { shape?: BotAvatarShape; colour?: BotAvatarPalette; eyes?: BotAvatarEyes; }
export interface CreateBotToolInput extends BotModelInput, BotAvatarInput {
  name: string;
  role?: string;
  instructions?: string;
  availability?: "everywhere" | "workspace";
  sharing?: "private" | "shared";
}
export interface UpdateBotToolInput extends BotModelInput, BotAvatarInput {
  id: string;
  name?: string;
  role?: string;
  instructions?: string;
}
export interface NoraBotOperations {
  create(input: CreateBotToolInput, context: NoraToolContext): Promise<BotDefinition>;
  update(input: UpdateBotToolInput, context: NoraToolContext): Promise<BotDefinition>;
  list(context: NoraToolContext): EffectiveBot[];
}

export interface NoraWorkspaceInfo { id: string; name: string; kind: string; path: string; branch: string | null; current: boolean; }
export interface NoraProviderModels { kind: string; instanceId: string; label: string; models: readonly string[]; unavailable: string | null; }
export interface NoraSettingsOperations {
  read(): Promise<AgentSettings>;
  update(patch: AgentSettingsPatch): Promise<AgentSettings>;
}

export interface NoraAppOperations {
  workspaces(context: NoraToolContext): NoraWorkspaceInfo[];
  models(context: NoraToolContext): Promise<NoraProviderModels[]>;
}

export interface NoraThreadQuery { allWorkspaces: boolean; includeSettled: boolean; limit: number; }
export interface NoraThreadInfo { id: string; title: string; workspace: string; bot: string | null; status: string; updatedAt: string; current: boolean; }
export interface NoraThreadMessage { role: "user" | "assistant"; text: string; createdAt: string; }
export interface NoraThreadTranscript { title: string; messages: readonly NoraThreadMessage[]; truncated: boolean; }
export interface NoraThreadOperations {
  list(query: NoraThreadQuery, context: NoraToolContext): NoraThreadInfo[];
  read(conversationId: string, limit: number, context: NoraToolContext): NoraThreadTranscript;
}

export interface NoraGroupMessage { author: string; text: string; createdAt: string; }
export interface NoraGroupHistory { title: string; messages: readonly NoraGroupMessage[]; more: boolean; }
export interface NoraGroupOperations {
  /** Group messages older than the newest `skip`, newest last; only for a member thread's own group. */
  history(skip: number, limit: number, context: NoraToolContext): NoraGroupHistory;
}

export interface NoraTaskInfo { path: string; title: string; column: string; columnId: string; completed: boolean; }
export interface NoraTaskOperations {
  list(context: NoraToolContext): Promise<NoraTaskInfo[]>;
  create(title: string, details: string | undefined, context: NoraToolContext): Promise<NoraTaskInfo>;
  move(path: string, column: string, context: NoraToolContext): Promise<NoraTaskInfo>;
}

export interface AskBotResult { botName: string; conversationId: string; reply: string; }
export interface NoraAskOperations {
  /** Runs the bot in its own child thread of the caller and waits for its final reply. */
  ask(bot: string, message: string, context: NoraToolContext, signal: AbortSignal): Promise<AskBotResult>;
}
export interface NoraMemoryOperations {
  remember(text: string, scope: "bot" | "workspace", context: NoraToolContext): BotMemoryEntry;
  recall(query: string, context: NoraToolContext): BotMemoryEntry[];
}

/** App operations the tools call; each acts as the user would in Nora, scoped to the calling thread. */
export interface NoraToolDeps {
  asks: NoraAskOperations;
  memory: NoraMemoryOperations;
  context(conversationId: string): NoraToolContext | null;
  bots: NoraBotOperations;
  app: NoraAppOperations;
  settings: NoraSettingsOperations;
  threads: NoraThreadOperations;
  groups: NoraGroupOperations;
  tasks: NoraTaskOperations;
}
export interface NoraToolServer {
  resolve: NoraToolEndpointResolver;
  running(): boolean;
  close(): Promise<void>;
}
