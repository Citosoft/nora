import type { ComposerSuggestionOption } from "./composerInput.types";
import type { TurnUndoControls } from "@/components/app/types/turnUndo.types";
import type { ThreadBackdropSettings } from "@shared/types/threadBackdrop.types";
import type { ChatWorkThread } from "./chatPanels.types";
import type { McpAppHost } from "./mcpApp.types";
import type { OutputHost } from "./toolImage.types";
import type { ThreadOutputTarget } from "./threadOutputs.types";
import type { BotAvatarState } from "./botAvatar.types";
import type { BotAvatar, BotSnapshot } from "@shared/types/bots/bots.types";
import type { ComposerAttachment } from "@shared/types/agentInput.types";
import type { ConversationRun, TimelineItem, RuntimeRequest, RequestResponse, ProviderBinding, ConversationCommand, ExecutionFailure } from "@shared/types/conversation/contracts.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ConversationClient } from "./conversationClient.types";
import type { ThreadDocument, ThreadDocumentRuntime } from "./thread-workspace/state.types";
import type { ThreadForgeClient } from "./threadForge.types";
import type { ProviderCapabilities } from "@shared/types/provider/capabilities.types";
import type { BindingOrigin } from "./modelPicker.types";
import type { MarkdownRendererLinkClickHandler } from "./markdownRenderer.types";
import type { ThreadConnectorsState } from "./threadConnectors.types";
import type { ThreadReferenceChoice } from "./threadReferences.types";
import type { MessagePinControls } from "./messagePins.types";
import type { ProviderSetupPorts } from "./providerSetup.types";

export type NativeMessageItem = Extract<TimelineItem, { kind: "message" }>;
export interface NativeMessageProps {
  mentions?: readonly ComposerSuggestionOption[];
  item: NativeMessageItem;
  onLinkClick?: MarkdownRendererLinkClickHandler;
  /** Absent where messages cannot be pinned, such as before a thread exists. */
  pins?: MessagePinControls;
  /** Where the hover toolbar sits; `overlay` takes no layout space, for messages continued by another. */
  actions?: NativeMessageActionsPlacement;
}
export type NativeMessageActionsPlacement = "inline" | "overlay";
export interface NativeMessageActionsProps {
  item: NativeMessageItem;
  pin?: { pinned: boolean; onToggle(): void };
  placement: NativeMessageActionsPlacement;
}
export interface NativeTimelineProps {
  mentions?: readonly ComposerSuggestionOption[];
  items: readonly TimelineItem[];
  runs?: readonly ConversationRun[];
  onLinkClick?: MarkdownRendererLinkClickHandler;
  /** The thread's connector discovery, for connector sign-in cards. */
  connectors?: ThreadConnectorsState | null;
  /** Looks up a bot by the id or name an ask_bot call used, for its card's face. */
  resolveBot?: (nameOrId: string) => { name: string; avatar: BotAvatar } | null;
  onOpenThread?: (conversationId: string) => void;
  /** Serves MCP tool widgets; without it, widget-bearing calls show only as tool activity. */
  mcpApps?: McpAppHost | null;
  /** Previews tool output images; without it, image-producing calls show only as tool activity. */
  toolOutputs?: OutputHost | null;
  /** Opens an output file in the file viewer, or with the operating system when the viewer can't show it. */
  onOpenOutput?: (target: ThreadOutputTarget) => Promise<void>;
  pins?: MessagePinControls;
  /** Offers undo on reviewed turns; absent where the thread cannot send commands. */
  turnUndo?: TurnUndoControls;
}
export interface NativeReviewProps {
  item: Extract<TimelineItem, { kind: "review" }>;
  undo?: TurnUndoControls;
}
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
  /** A chat's work threads, newest first; empty for ordinary threads. */
  workThreads: readonly ChatWorkThread[];
  /** All work owned by a direct chat's bot, including its other chats and workspaces. */
  botWorkThreads: readonly ChatWorkThread[];
  openThread(conversationId: string): void;
  /** Settles another thread, such as one of a chat's branches. */
  settleThread(conversationId: string): Promise<void>;
  /** Retires this direct chat and opens a fresh one with its bot; rejects with a user-meaningful message. */
  resetDirectChat(): Promise<void>;
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
  /** The workspace as registered, listing every checkout; `workspace` is the checkout this thread runs in. */
  baseWorkspace: NativeWorkspace;
  selectCheckout(checkoutId: string | null): void;
  /** Creates a worktree and runs this draft in it; null where the workspace isn't an open Git project. */
  createWorktree: ((branch: string) => Promise<void>) | null;
  /** Null where the view is hosted outside the session center, such as the app builder drawer. */
  threadBackdrop: ThreadBackdropSettings | null;
  /** Null outside the session center; the setup panel then offers no Settings link. */
  providerSetup: ProviderSetupPorts | null;
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
export interface ThreadBotBadgeProps {
  bot: BotSnapshot;
  state: BotAvatarState;
  modelOverride: boolean;
  /** Switches the thread back to its bot's saved model on the next send; absent while the thread is busy. */
  onUseBotModel?: () => void;
}
