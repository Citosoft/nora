import type { TurnActivity } from "@shared/types/conversation/turnActivity.types";

export const TURN_ACTIVITY_ORBS = {
  starting: "working",
  stopping: "working",
  waiting: "working",
  thinking: "solving",
  searching: "searching",
  connecting: "connecting",
  working: "working",
  composing: "composing"
} as const satisfies Record<TurnActivity["kind"], string>;
