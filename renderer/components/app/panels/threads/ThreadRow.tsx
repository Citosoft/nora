import { GitPullRequest, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ThreadStatusIcon } from "./ThreadStatusIcon";
import type { ThreadRowProps } from "@/components/app/types/thread-workspace/ports.types";

export function ThreadRow({ row, workspaceName, request, onOpen, onTogglePin }: ThreadRowProps) {
  const linkedRequest = request?.pullRequestNumber ? request : null;
  const requestLabel = linkedRequest ? `PR / MR #${linkedRequest.pullRequestNumber} · ${linkedRequest.label}` : null;
  const stateLabel = row.attention || row.status === "Interrupted" ? `, ${row.status.toLocaleLowerCase()}` : "";
  return <div className={`group flex items-center rounded-md ${row.selected ? "bg-secondary" : "hover:bg-muted"}`}>
    <Tooltip content={`${row.status}${requestLabel ? ` · ${requestLabel}` : ""}`} triggerClassName="flex min-w-0 flex-1">
      <button type="button" aria-label={`Open ${row.title}${stateLabel}${row.unread ? ", unread completion" : ""}${requestLabel ? `, ${requestLabel}` : ""}`} aria-current={row.selected ? "page" : undefined}
        onClick={() => onOpen(row)} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className={`min-w-0 flex-1 truncate text-sm ${row.unread ? "font-medium" : ""}`}>{row.title}</span>
        {workspaceName && <span className="max-w-20 truncate text-[11px] text-muted-foreground">{workspaceName}</span>}
        {requestLabel && <GitPullRequest role="img" aria-label={requestLabel} className="size-3.5 shrink-0 text-muted-foreground" />}
        <ThreadStatusIcon row={row} />
      </button>
    </Tooltip>
    {row.target.kind === "thread" && <Button size="icon" variant="ghost" className="mr-1 size-7 shrink-0" aria-label={`${row.pinned ? "Unpin" : "Pin"} ${row.title}`} aria-pressed={row.pinned}
      onClick={() => { if (row.target.kind === "thread") onTogglePin(row.target.conversationId); }}><Pin className={`size-3 ${row.pinned ? "fill-current" : "text-muted-foreground"}`} aria-hidden="true" /></Button>}
  </div>;
}
