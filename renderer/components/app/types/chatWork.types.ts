import type { ReactNode } from "react";
import type { ChatWorkPanelProps, ChatWorkThread } from "./chatPanels.types";

export type ChatWorkPhase = "pending" | "in-progress" | "completed" | "attention";
export interface ChatWorkGroup {
  phase: ChatWorkPhase;
  title: string;
  threads: readonly ChatWorkThread[];
}

/** A small uppercase label heading a section of the chat sidebar. */
export interface ChatSectionLabelProps { className?: string; children: ReactNode; }
export interface ChatWorkSectionProps {
  title: string;
  count: number;
  children: ReactNode;
}

export interface ChatWorkRowProps extends Pick<ChatWorkPanelProps, "onOpenThread" | "onSettleThread"> {
  thread: ChatWorkThread;
  now: number;
}
export type ChatWorkSettleState = { status: "idle" } | { status: "settling" } | { status: "failed"; message: string };
