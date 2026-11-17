import type { ReactNode } from "react";

export interface SessionTabStackProps { children: ReactNode; className?: string; }
export interface SessionTabPaneProps {
  /** Hidden panes retain their DOM and scroll position but cannot receive input or focus. */
  visible: boolean;
  children: ReactNode;
  className?: string;
}
