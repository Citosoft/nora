import type { ConversationCommand, ConversationRun, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { TurnUndoAvailability, TurnUndoMode, TurnUndoState } from "@shared/types/conversation/turnUndo.types";

export interface TurnUndoInput {
  conversationId: string | null;
  items: readonly TimelineItem[];
  runs: readonly ConversationRun[];
  execute(command: ConversationCommand): Promise<void>;
}
/** Thread-level undo: what each review item can offer, and the command that asks for it. */
export interface TurnUndoControls {
  availability(itemId: string): TurnUndoAvailability;
  undo(runId: string, mode: TurnUndoMode): void;
}
/** What one turn's changes card needs to offer and report undo. */
export interface TurnChangesUndo {
  availability: TurnUndoAvailability;
  state: TurnUndoState | undefined;
  onUndo(mode: TurnUndoMode): void;
}
export interface TurnUndoPartProps {
  undo: TurnChangesUndo;
  fileCount: number;
}
