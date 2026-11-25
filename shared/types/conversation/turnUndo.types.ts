import type { z } from "zod";
import type { turnUndoConflictSchema, turnUndoModeSchema, turnUndoStateSchema } from "@shared/conversations/turnUndo";

export type TurnUndoMode = z.infer<typeof turnUndoModeSchema>;
export type TurnUndoConflict = z.infer<typeof turnUndoConflictSchema>;
export type TurnUndoState = z.infer<typeof turnUndoStateSchema>;
export type TurnUndoUnavailableReason = "expired" | "later-turn" | "busy";
export type TurnUndoAvailability =
  | { kind: "none" }
  | { kind: "available" }
  | { kind: "pending" }
  | { kind: "undone" }
  | { kind: "unavailable"; reason: TurnUndoUnavailableReason };
