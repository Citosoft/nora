import { X } from "lucide-react";
import { useThreadTabsPorts } from "@/components/app/hooks/useThreadTabsPorts";

/** Native thread views use the same center-pane stack as Nora's other workspace tools. */
export function ThreadTabs() {
  const ports = useThreadTabsPorts();
  return <nav aria-label="Open threads" className="flex shrink-0 gap-1 overflow-x-auto border-b px-2 pt-1 dark:bg-[hsl(var(--shell-background))]">{ports.documents.map((document) => {
    const title = ports.titles[document.id];
    return <div key={document.id} className={`flex max-w-60 shrink-0 items-center rounded-t-lg border-b-2 ${ports.activeId === document.id ? "border-primary bg-muted dark:bg-background" : "border-transparent hover:bg-muted/60"}`}>
      <button type="button" aria-current={ports.activeId === document.id ? "page" : undefined} className="min-w-0 truncate rounded-tl-lg px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => ports.focus(document.id)}>{title}{document.text && document.target.kind === "thread" ? " · Draft" : ""}</button>
      <button type="button" aria-label={`Close ${title} view`} className="mr-1 rounded p-1 text-muted-foreground hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => ports.close(document.id)}><X className="size-3" aria-hidden="true" /></button>
    </div>;
  })}</nav>;
}
