import type { InboxItem, InboxSnapshot } from "@shared/types/inbox/inbox.types";
import type { InboxArrivalWatch } from "@main/types/inbox/inbox.types";

/**
 * Calls `onChange` with every inbox snapshot and the items that newly entered `select`'s set since the last one (an item
 * that leaves and returns, such as one waking from a snooze, arrives again). Items already selected when watching
 * starts are treated as seen, so they are never announced.
 */
export function watchInboxArrivals(watch: InboxArrivalWatch, onChange: (snapshot: InboxSnapshot, arrived: InboxItem[]) => void): () => void {
  const idsOf = (snapshot: InboxSnapshot): Set<string> => new Set(watch.select(snapshot).map((item) => item.id));
  let seen = idsOf(watch.inbox.snapshot());
  return watch.inbox.subscribe((snapshot) => {
    const selected = watch.select(snapshot);
    const arrived = selected.filter((item) => !seen.has(item.id));
    seen = new Set(selected.map((item) => item.id));
    onChange(snapshot, arrived);
  });
}
