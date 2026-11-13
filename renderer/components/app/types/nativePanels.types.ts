import type { ReactNode } from "react";
import type { BotAvatarState } from "./botAvatar.types";
import type { BotAvatar, BotDefinition, BotSnapshot, EffectiveBot, GroupMember } from "@shared/types/bots/bots.types";
import type { ComposerAttachment } from "@shared/types/agentInput.types";
import type { ConversationRun, TimelineItem, RuntimeRequest, RequestResponse, ProviderBinding, ConversationCommand, ExecutionFailure } from "@shared/types/conversation/contracts.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ConversationClient } from "./conversationClient.types";
import type { ConversationReview } from "@shared/types/conversation/review.types";
import type { ThreadDocument, ThreadDocumentRuntime } from "./thread-workspace/state.types";
import type { ThreadForgeClient } from "./threadForge.types";
import type { ProviderCapabilities } from "@shared/types/provider/capabilities.types";
import type { BindingOrigin } from "./modelPicker.types";
import type { MarkdownRendererLinkClickHandler } from "./markdownRenderer.types";
import type { ThreadConnectorsState } from "./threadConnectors.types";
import type { ThreadReferenceChoice } from "./threadReferences.types";

export type NativeMessageItem = Extract<TimelineItem, { kind: "message" }>;
export interface NativeMessageProps {
  item: NativeMessageItem;
  onLinkClick?: MarkdownRendererLinkClickHandler;
  /** Opens the thread where a group member wrote this reply; absent while member threads are hidden. */
  onOpenAuthorThread?: (botId: string) => void;
}
export interface NativeMessageActionsProps {
  item: NativeMessageItem;
}
export interface NativeTimelineProps {
  items: readonly TimelineItem[];
  runs?: readonly ConversationRun[];
  onLinkClick?: MarkdownRendererLinkClickHandler;
  onOpenAuthorThread?: NativeMessageProps["onOpenAuthorThread"];
  /** The thread's connector discovery, for connector sign-in cards. */
  connectors?: ThreadConnectorsState | null;
  /** Looks up a bot by the id or name an ask_bot call used, for its card's face. */
  resolveBot?: (nameOrId: string) => { name: string; avatar: BotAvatar } | null;
  onOpenThread?: (conversationId: string) => void;
}
export interface NativeReviewProps { result: ConversationReview; }
export interface NativeRequestProps {
  request: RuntimeRequest;
  busy: boolean;
  presentation?: "panel" | "dialog";
  onRespond(response: RequestResponse): Promise<void>;
}
export interface NativeRequestStackProps {
  requests: readonly RuntimeRequest[];
  busy: boolean;
  visible: boolean;
  onRespond(requestId: string, response: RequestResponse): Promise<void>;
}
export interface NativeConversationPorts {
  referenceChoices: readonly ThreadReferenceChoice[];
  addThreadReference(conversationId: string): Promise<void>;
  removeThreadReference(referenceId: string): void;
  openThreadSettings?: () => void;
  openBotSettings?: () => void;
  /** In a group chat, each member's own thread by bot id. */
  memberThreads: ReadonlyMap<string, string>;
  openThread(conversationId: string): void;
  visible: boolean;
  userDisplayName: string;
  threadForge: ThreadForgeClient | null;
  client: ConversationClient;
  workspace: NativeWorkspace;
  state: NativeBoot;
  document: ThreadDocument;
  runtime: ThreadDocumentRuntime;
  storageError: string | null;
  latestFailure: ExecutionFailure | null;
  addAttachments(attachments: readonly ComposerAttachment[]): void;
  removeAttachment(attachmentId: string): void;
  setText(text: string): void;
  setBinding(binding: ProviderBinding | null, origin: BindingOrigin): void;
  submit(): Promise<void>;
  execute(command: ConversationCommand): Promise<void>;
  compact(): Promise<void>;
  selectWorkspace(workspaceId: string): void;
  selectBot(botId: string | null): void;
}
export interface NativeProviderPickerProps {
  allowChange?: boolean;
  state: NativeBoot;
  workspace: NativeWorkspace;
  client: ConversationClient;
  locked: ProviderBinding | null;
  /** A bot seed may omit the permission policy, which then resolves to the runtime's first policy. */
  initial: ProviderBindingSeed | null;
  onBinding(binding: ProviderBinding | null, origin: BindingOrigin): void;
  onCapabilities?(capabilities: ProviderCapabilities | null): void;
  /** Opens already changing an existing thread's model to `initial`, e.g. back to its bot's saved model. */
  startEditing?: boolean;
}
export interface NativeQueueProps {
  conversationId: string;
  runs: readonly ConversationRun[];
  paused: boolean;
  busy: boolean;
  steerTarget?: string | null;
  execute(command: ConversationCommand): Promise<void>;
}
export interface QueuedInstructionRowProps extends Pick<NativeQueueProps, "conversationId" | "busy" | "execute" | "steerTarget"> {
  run: ConversationRun;
  position: number;
}
/** A starting binding for the model picker, such as a bot's saved model. */
export type ProviderBindingSeed = Omit<ProviderBinding, "permissionPolicy"> & { permissionPolicy: string | null };
export interface ThreadBotPickerProps {
  bots: readonly EffectiveBot[];
  /** The bot an existing thread runs as; shown read-only. */
  current: BotSnapshot | null;
  currentState: BotAvatarState;
  selectedId: string | null;
  modelOverride: boolean;
  /** Switches the thread back to its bot's saved model on the next send; absent while the thread is busy. */
  onUseBotModel?: () => void;
  disabled: boolean;
  onSelect(botId: string | null): void;
  onManage?: () => void;
}
export interface ThreadBotGreetingProps { bot: Pick<BotDefinition, "name" | "role" | "avatar">; workspaceName: string; }
export interface ThreadBotChoiceProps { selected: boolean; onSelect(): void; icon: ReactNode; name: string; detail: string; badge?: string | null; }
export interface GroupMembersProps { members: readonly Pick<GroupMember, "botId" | "name" | "avatar">[]; writer: string | null; lead: string | null; }
export interface NativeGroupGreetingProps { members: readonly Pick<GroupMember, "botId" | "name" | "avatar">[]; workspaceName: string; }
