import type { ReactNode } from "react";
import type { BotAvatar, BotDefinition, BotOrigin, BotTemplate, BotTemplateSuggestions, EffectiveBot, GroupRequest } from "@shared/types/bots/bots.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { BotAvatarState } from "./botAvatar.types";
import type { ThreadNavigationRow } from "./thread-workspace/ports.types";

/** One entry in Bots mode: the built-in Nora assistant (no avatar, app icon) or a configured bot. */
export interface BotNavigationItem {
  id: string;
  name: string;
  role: string;
  /** Null for Nora, which keeps the app's own mark rather than a blob. */
  avatar: BotAvatar | null;
  /** The bot's model, or null for Nora (which uses each thread's own). */
  model: string | null;
  origin: BotOrigin | "built-in";
  /** Unsettled threads in this workspace, most recent first. */
  threads: readonly ThreadNavigationRow[];
  /** The most urgent state across those threads. */
  state: BotAvatarState;
}
export interface BotNavigationGroup { id: "built-in" | "workspace" | "global"; label: string | null; items: readonly BotNavigationItem[]; }
export interface BotNavigationProps {
  /** Registered native workspace, or null when only global bots apply. */
  workspaceId: string | null;
  workspaceName: string | null;
  query: string;
  collapsed: boolean;
  /** Starts a thread with a bot, or with Nora when the id is null. */
  /** Opens a bot's chat, or starts a Nora thread for null. */
  onStart(botId: string | null): void;
  onNavigate(): void;
  /** Switches the sidebar to Threads, where every thread is listed. */
  onShowThreads(): void;
  /** Opens the new group dialog; absent where groups cannot be created (no registered workspace). */
  onNewGroup?: () => void;
}
export interface BotNavigationRowProps {
  item: BotNavigationItem;
  expanded: boolean;
  now: number;
  onToggle(): void;
  onStart(): void;
  onOpen(row: ThreadNavigationRow): void;
  onTogglePin(row: ThreadNavigationRow): void;
  onShowAllThreads(): void;
  /** Opens the info panel (for Nora: its threads and notes). */
  onShowInfo?(): void;
  /** Opens the bot editor; absent for Nora. */
  onEdit?(): void;
  /** Asks to delete the bot; absent for Nora. */
  onDelete?(): void;
}
export interface BotRowContextMenuProps extends Pick<BotNavigationRowProps, "expanded" | "onToggle" | "onStart" | "onShowInfo" | "onEdit" | "onDelete"> {
  children: ReactNode;
  id: string;
  name: string;
  hasThreads: boolean;
}
/** Everything the info panel shows: a configured bot's definition and groups, or Nora, which has only its threads and notes. */
export type BotInfo = {
  kind: "bot";
  item: BotNavigationItem;
  bot: EffectiveBot;
  /** Provider label for the bot's model, e.g. "Claude"; the raw kind when the provider is not installed. */
  provider: string;
  /** Group chats in this workspace the bot is a member of, most recent first. */
  groups: readonly ThreadNavigationRow[];
} | { kind: "nora"; item: BotNavigationItem };
export interface BotInfoPanelProps {
  info: BotInfo;
  workspace: NativeWorkspace | null;
  workspaces: readonly NativeWorkspace[];
  now: number;
  onStart(): void;
  onOpen(row: ThreadNavigationRow): void;
  onTogglePin(row: ThreadNavigationRow): void;
  /** Edit and Delete apply to configured bots only; Nora's panel has neither. */
  onEdit(): void;
  onDelete(): void;
  onClose(): void;
}
export interface DeleteBotDialogProps { bot: BotDefinition; onClose(): void; }
export interface BotInfoSectionProps { title: string; children: ReactNode; }
/** Which edge of the window the strip sits on; it follows the workspace sidebar when sidebars are swapped. */
export interface SidebarModeStripProps { edge: "left" | "right"; }
export interface NewGroupDialogProps {
  bots: readonly EffectiveBot[];
  workspaceName: string | null;
  onCreate(group: GroupRequest): void;
  onClose(): void;
}
export interface BotsHomeState {
  workspace: NativeWorkspace | null;
  /** Nora first, then the workspace's bots, then global ones, each with its threads and face state. */
  items: readonly BotNavigationItem[];
  groupThreads: readonly ThreadNavigationRow[];
  bots: readonly EffectiveBot[];
  takenIds: ReadonlySet<string>;
  /** Templates for the workspace's effective role first, then the rest. */
  templates: BotTemplateSuggestions;
  /** The role the suggestions are for, e.g. "Developer"; null when there are none. */
  templateRole: string | null;
  startThread(botId: string | null): void;
  startGroup(group: GroupRequest): void;
  openThread(row: ThreadNavigationRow): void;
  togglePin(row: ThreadNavigationRow): void;
}
export interface BotHomeCardProps { item: BotNavigationItem; onStart(): void; onEdit: (() => void) | null; }
export interface BotTemplateCardProps { template: BotTemplate; onUse(): void; }
export interface BotsIntroProps { onNewBot(): void; faces: readonly BotTemplate[]; }
export interface BotTemplateSectionProps { id: string; title: string; description?: string; templates: readonly BotTemplate[]; onUse(template: BotTemplate): void; }
