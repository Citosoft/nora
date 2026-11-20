export type ChatActivityKind = "started" | "completed" | "failed" | "interrupted" | "waiting" | "notice";
export interface ChatActivityEvent {
  id: string;
  kind: ChatActivityKind;
  title: string;
  detail?: string;
  createdAt: string;
  threadId: string | null;
}
export interface ChatActivityTimelineProps {
  events: readonly ChatActivityEvent[];
  onOpenThread(id: string): void;
}
