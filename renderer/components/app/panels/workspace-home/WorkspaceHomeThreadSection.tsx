import { WorkspaceHomeThreadRow } from "./WorkspaceHomeThreadRow";
import { WorkspaceHomeHeading } from "./WorkspaceHomeHeading";
import type { WorkspaceHomeThreadSectionProps } from "@/components/app/types/workspace-home/home.types";

export function WorkspaceHomeThreadSection({ id, title, rows, providerLabels, now, tone, leading, onOpenThread }: WorkspaceHomeThreadSectionProps) {
  const count = rows.length + (leading?.count ?? 0);
  if (!count) return null;
  const headingId = `home-${id}-title`;
  return <section aria-labelledby={headingId}>
    <WorkspaceHomeHeading id={headingId} count={count} tone={tone}>{title}</WorkspaceHomeHeading>
    <div className={`overflow-hidden rounded-xl border bg-card/40 ${tone === "attention" ? "border-amber-500/40 bg-amber-500/5" : ""}`}>
      {leading?.node}
      {rows.map((row, index) => <WorkspaceHomeThreadRow key={row.id} row={row} providerLabel={row.providerKind ? providerLabels.get(row.providerKind) : undefined} now={now} order={index} onOpen={onOpenThread} />)}
    </div>
  </section>;
}
