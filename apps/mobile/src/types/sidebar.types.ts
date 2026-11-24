import type { DirectDescriptor } from "@shared/types/bots/bots.types";
import type { ExecutionState } from "./conversationState.types";
import type { Href } from "expo-router";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { ReactNode } from "react";
import type { RemoteProject } from "@shared/types/remote-access/runtimeApi.types";
import type { IconName } from "./icon.types";

export interface SidebarProps {
  runtimeId: string;
  runtimeName: string;
  /** The open conversation, highlighted in the list; null on the new-chat screen. */
  activeConversationId: string | null;
  visible: boolean;
  /** Rendered as a permanent column on wide windows: its header button collapses it to the icon rail. */
  persistent?: boolean;
  onClose: () => void;
}

export interface SidebarRowProps {
  label: string;
  icon?: IconName;
  /** Replaces the icon, e.g. a bot's avatar. */
  leading?: ReactNode;
  selected?: boolean;
  onPress: () => void;
  /** Muted text or a badge on the right (e.g. "2 running"). */
  detail?: string | null;
  /** Extra trailing control, e.g. "new chat in this project". */
  trailing?: ReactNode;
  accessibilityLabel?: string;
}

export interface ConversationShellProps {
  runtimeId: string;
  activeConversationId: string | null;
  /** Centre of the top bar (the computer pill on the home screen, the chat title in a chat). */
  center: ReactNode;
  children: ReactNode;
}

export interface WorkspaceSwitcherProps {
  workspaces: readonly RemoteProject[];
  /** The workspace whose chats are shown; null shows chats from every workspace. */
  selectedId: string | null;
  onSelect: (workspaceId: string | null) => void;
}

export interface SidebarBotsProps {
  runtimeId: string;
  projectId: string | null;
  activeConversationId: string | null;
  summaries: readonly ConversationSummary[];
  onNavigate(href: Href, mode?: "push" | "replace"): void;
}

export interface ChatTitleProps {
  title: string;
  status: ExecutionState | null;
  bot?: Pick<DirectDescriptor, "name" | "avatar"> | null;
  onEditBot?: () => void;
}
