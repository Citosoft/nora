import type { ConversationRun, TimelineItem } from "./contracts.types";
import type { ConversationHeader } from "./queries.types";

/** A client's loaded view of one conversation: its header, the loaded timeline window and the turns covering it. */
export interface ConversationView {
  header: ConversationHeader;
  items: TimelineItem[];
  nextBefore: number | null;
  runHistory: ConversationRunHistory;
}
export interface ConversationRunHistory { runs: ConversationRun[]; nextBefore: number | null; }
