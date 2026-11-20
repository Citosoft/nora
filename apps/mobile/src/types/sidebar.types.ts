import type { ReactNode } from "react";
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
