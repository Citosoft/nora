import type { KeyboardEvent } from "react";
import { CheckCheck } from "lucide-react";
import type { InboxSectionListProps } from "@/components/app/types/inbox.types";
import { InboxRequestRow } from "./InboxRequestRow";
import { InboxEntryRow } from "./InboxEntryRow";

/** j and k (or the arrow keys) move between rows; each row keeps its own buttons in tab order. */
function moveFocus(event: KeyboardEvent<HTMLDivElement>): void {
  const step = event.key === "j" || event.key === "ArrowDown" ? 1 : event.key === "k" || event.key === "ArrowUp" ? -1 : 0;
  if (!step || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  const rows = Array.from(event.currentTarget.querySelectorAll<HTMLLIElement>("ul[data-inbox-list] > li"));
  const current = rows.findIndex((row) => row.contains(document.activeElement));
  const next = rows[Math.min(rows.length - 1, Math.max(0, current + step))];
  const target = next?.querySelector<HTMLElement>("[data-inbox-row], button");
  if (!target) return;
  event.preventDefault();
  target.focus();
}

export function InboxSectionList({ sections, now, actions, emptyMessage }: InboxSectionListProps) {
  const filled = sections.filter((section) => section.items.length);
  if (!filled.length) return <div role="status" className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
    <CheckCheck className="size-6" aria-hidden="true" /><p className="font-medium text-foreground">You're all caught up</p><p>{emptyMessage}</p></div>;
  return <div className="flex flex-col gap-6" onKeyDown={moveFocus}>
    {filled.map((section) => <section key={section.id} aria-labelledby={`inbox-${section.id}`}>
      <h2 id={`inbox-${section.id}`} className="mb-2 flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {section.title}<span className="tabular-nums">{section.items.length}</span></h2>
      <ul data-inbox-list className="divide-y overflow-hidden rounded-lg border bg-card">
        {section.items.map((item) => item.kind === "request"
          ? <InboxRequestRow key={item.id} item={item} now={now} actions={actions} />
          : <InboxEntryRow key={item.id} item={item} now={now} actions={actions} />)}
      </ul>
    </section>)}
  </div>;
}
