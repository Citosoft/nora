import type { ConversationView } from "@shared/types/conversation/conversationView.types";
import type { TurnStatus } from "@/types/conversationState.types";
import { turnActivity } from "@shared/conversations/turnActivity";
import { stoppableRun, workingLabel } from "./chatState";

/** Read raw timeline activity, including hidden reasoning, and ignore older turns. */
export function conversationTurnStatus(view: ConversationView): TurnStatus {
  const run = stoppableRun(view);
  const activity = run ? turnActivity(run, view.items.findLast((item) => item.runId === run.id) ?? null) : null;
  return { activity, label: activity?.label ?? workingLabel(view) };
}
