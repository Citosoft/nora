import { REMOTE_RUN_ACTIONS } from "@shared/conversations/contracts";
import type { ConversationEvent, ConversationRun } from "@shared/types/conversation/contracts.types";
import type { ConversationEventPage, ConversationHeader } from "@shared/types/conversation/queries.types";

/**
 * Phones validate runs strictly, so a run action they do not know would make them reject the whole reply. Such runs are
 * served without their action; the phone still shows the run's opening milestone from the timeline.
 */
export function remoteRun(run: ConversationRun): ConversationRun {
  if (!run.action || REMOTE_RUN_ACTIONS.has(run.action)) return run;
  const served = { ...run };
  delete served.action;
  return served;
}

export function remoteEvent(event: ConversationEvent): ConversationEvent {
  return event.payload.kind === "run" ? { ...event, payload: { ...event.payload, run: remoteRun(event.payload.run) } } : event;
}

export function remoteEventPage(page: ConversationEventPage): ConversationEventPage {
  return { ...page, events: page.events.map(remoteEvent) };
}

export function remoteHeader(header: ConversationHeader): ConversationHeader {
  return { ...header, activeRuns: header.activeRuns.map(remoteRun), queuedRuns: header.queuedRuns.map(remoteRun) };
}
