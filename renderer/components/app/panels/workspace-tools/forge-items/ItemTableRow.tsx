import { useId } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useForgeItemDetail } from "@/components/app/hooks/useForgeItemDetail";
import { isDraftRequest, requestChangeCounts } from "@/components/app/logic/forge-items/list";
import type { ItemRowProps } from "@/components/app/types/forge-items/list.types";
import { DiffCounts } from "@/components/app/panels/conversations/DiffCounts";
import { Button } from "@/components/ui/button";
import { ItemDetails } from "./ItemDetails";

const updatedFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function ItemTableRow({ kind, item, projectId, repo, expanded, readDetail, onToggle, onOpen }: ItemRowProps) {
  const detailsId = useId();
  const { state, retry } = useForgeItemDetail({
    identity: JSON.stringify([projectId, repo.provider, repo.host, repo.fullName, kind, item.id, item.updatedAt]),
    enabled: expanded,
    read: () => readDetail(projectId, kind, item)
  });
  const draft = kind === "pull_request" && isDraftRequest(item);
  const updated = new Date(item.updatedAt);
  const updatedLabel = Number.isNaN(updated.getTime()) ? "Unknown update time" : updatedFormat.format(updated);
  const reference = `${kind === "pull_request" && repo.provider === "gitlab" ? "!" : "#"}${item.number}`;
  const counts = state.status === "ready" ? requestChangeCounts(state.value.changes) : null;
  return <>
    <tr className={`border-b border-border/60 transition-colors ${expanded ? "bg-muted/40" : "hover:bg-muted/25"}`}>
      <td className="w-12 py-3 pl-4 pr-2">
        <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={onToggle} aria-label={`${expanded ? "Collapse" : "Expand"} ${reference}`} aria-expanded={expanded} aria-controls={detailsId}>
          {expanded ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
        </Button>
      </td>
      <th scope="row" className="min-w-0 px-3 py-3 text-left font-normal">
        <button type="button" className="block w-full truncate rounded-md text-left text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onToggle} aria-expanded={expanded} aria-controls={detailsId} title={item.title}>{item.title}</button>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><span className="shrink-0 font-mono">{reference}</span>{kind === "pull_request" && <><span aria-hidden="true">·</span><span className="truncate font-mono" title={item.sourceBranch ?? undefined}>{item.sourceBranch || "Unknown branch"}</span></>}</div>
      </th>
      <td className="px-3 py-3 text-xs"><span className="block truncate" title={item.author ?? undefined}>{item.author || "Unknown author"}</span><span className="mt-1 block text-[11px] text-muted-foreground" title={Number.isNaN(updated.getTime()) ? undefined : `Updated ${updated.toLocaleString()}`}>{updatedLabel}</span></td>
      <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className={`size-1.5 rounded-full ${draft ? "bg-muted-foreground" : "bg-primary"}`} aria-hidden="true" />{draft ? "Draft" : "Open"}</span></td>
      {kind === "pull_request" && <td className="px-3 py-3 text-right"><DiffCounts counts={counts} />{!counts && <button type="button" className="rounded-md text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onToggle} aria-expanded={expanded} aria-controls={detailsId}>{state.status === "loading" ? "Loading…" : "View changes"}</button>}</td>}
    </tr>
    <tr id={detailsId} hidden={!expanded} className="border-b border-border/60 bg-muted/20">
      <td colSpan={kind === "issue" ? 4 : 5} className="p-0">{expanded && <ItemDetails kind={kind} item={item} state={state} onRetry={retry} onOpen={onOpen} />}</td>
    </tr>
  </>;
}
