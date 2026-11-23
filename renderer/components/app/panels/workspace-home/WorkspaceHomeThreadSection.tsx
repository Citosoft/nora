import { WorkspaceHomeThreadRow } from "./WorkspaceHomeThreadRow";
import type { WorkspaceHomeThreadSectionProps } from "@/components/app/types/workspace-home/home.types";

export function WorkspaceHomeThreadSection({ id, title, rows, providerLabels, now, tone, leading, onOpenThread }: WorkspaceHomeThreadSectionProps) {
  const count = rows.length + (leading?.count ?? 0);
  if (!count) return null;
  const headingId = `home-${id}-title`;
  return <section aria-labelledby={headingId}>
    <h2 id={headingId} className={`mb-2 flex items-center gap-2 text-sm font-medium ${tone === "attention" ? "text-amber-700 dark:text-amber-400" : ""}`}>
      {title}<span className="rounded-full bg-muted px-1.5 text-[11px] font-normal tabular-nums text-muted-foreground">{count}</span>
    </h2>
    <div className={`overflow-hidden rounded-lg border ${tone === "attention" ? "border-amber-500/40 bg-amber-500/5" : ""}`}>
      {leading?.node}
      {rows.map((row) => <WorkspaceHomeThreadRow key={row.id} row={row} providerLabel={row.providerKind ? providerLabels.get(row.providerKind) : undefined} now={now} onOpen={onOpenThread} />)}
    </div>
  </section>;
}
