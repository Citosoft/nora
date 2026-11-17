import { applyConversationEvent, mergeTimeline } from "@shared/conversations/conversationView";
import type { ConversationEvent } from "@shared/types/conversation/contracts.types";
import type { ConversationView } from "@shared/types/conversation/conversationView.types";
import type { ConversationDetailResponse } from "@shared/types/remote-access/runtimeApi.types";
import type { TimelinePage } from "@/types/runtimeClient.types";

/** Builds the loaded view from `GET /v1/conversations/:id`; later events are applied with the shared reducer. */
export function viewFromDetail(detail: ConversationDetailResponse): ConversationView {
  return {
    header: detail.header,
    items: detail.timeline.items,
    nextBefore: detail.timeline.nextBefore,
    runHistory: { runs: [...detail.header.activeRuns, ...detail.header.queuedRuns], nextBefore: null }
  };
}

/** Applies realtime events in order through the desktop's own reducer; replays at or below the view cursor are no-ops. */
export function applyEvents(view: ConversationView, events: readonly ConversationEvent[]): ConversationView {
  return events.reduce(applyConversationEvent, view);
}

/** Adds an older timeline page (`before = nextBefore`) in front of the loaded window. */
export function prependOlder(view: ConversationView, page: TimelinePage): ConversationView {
  return { ...view, items: mergeTimeline(page.items, view.items), nextBefore: page.nextBefore };
}
