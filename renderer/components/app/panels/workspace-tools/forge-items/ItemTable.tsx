import { useMemo, useState } from "react";
import { groupForgeItems } from "@/components/app/logic/forge-items/list";
import type { ItemTableProps } from "@/components/app/types/forge-items/list.types";
import { ItemTableRow } from "./ItemTableRow";

export function ItemTable({ kind, items, projectId, repo, readDetail, onOpen }: ItemTableProps) {
  const groups = useMemo(() => groupForgeItems(items, kind), [items, kind]);
  const [expandedId, setExpandedId] = useState<string | null>(() => groups[0]?.items[0]?.id ?? null);
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[660px] table-fixed text-left" aria-label={kind === "issue" ? "Workspace issues" : repo.provider === "github" ? "Workspace pull requests" : "Workspace merge requests"}>
      <thead className="border-b border-border/60 text-xs text-muted-foreground"><tr>
        <th scope="col" className="w-12 py-3 pl-4 pr-2 font-normal"><span className="sr-only">Details</span></th>
        <th scope="col" className="px-3 py-3 font-normal">{kind === "issue" ? "Issue" : repo.provider === "github" ? "Pull request" : "Merge request"}</th>
        <th scope="col" className="w-36 px-3 py-3 font-normal">Author / updated</th>
        <th scope="col" className="w-24 px-3 py-3 font-normal">Status</th>
        {kind === "pull_request" && <th scope="col" className="w-36 px-3 py-3 text-right font-normal">Changes</th>}
      </tr></thead>
      {groups.map((group) => <tbody key={group.id}>
        <tr className="border-b border-border/60 bg-muted/25"><th scope="rowgroup" colSpan={kind === "issue" ? 4 : 5} className="px-5 py-2.5 text-xs font-medium text-muted-foreground">{group.label}<span className="ml-2 font-normal tabular-nums">{group.items.length}</span></th></tr>
        {group.items.map((item) => <ItemTableRow kind={kind} key={item.id} item={item} projectId={projectId} repo={repo} readDetail={readDetail} expanded={expandedId === item.id}
          onToggle={() => setExpandedId((current) => current === item.id ? null : item.id)} onOpen={() => onOpen(item)} />)}
      </tbody>)}
    </table>
  </div>;
}
