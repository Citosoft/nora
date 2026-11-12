import { ChevronDown, ChevronUp, ExternalLink, FileCode2, GitBranch, GitPullRequest, LoaderCircle, RefreshCcw } from "lucide-react";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { ThreadInsightsPanelProps } from "@/components/app/types/threadInsights.types";
import { Button } from "@/components/ui/button";
import { useId } from "react";
import { ThreadIdePicker } from "./ThreadIdePicker";
import { DiffCounts } from "./DiffCounts";
import { ThreadConnectors } from "./ThreadConnectors";
import { ThreadSubagents } from "./ThreadSubagents";
import { ThreadSkills } from "./ThreadSkills";

export function ThreadInsightsPanel({ header, providerLabel, connectors, skills, changes, subagents, request, expanded, busy, canSettle, hasOlderHistory, onToggle, onRefresh, onLoadHistory, onSettleChange }: ThreadInsightsPanelProps) {
  const detailsId = useId();
  const conversation = header.conversation;
  const changeRequest = request.status === "ready" ? request.request : null;
  const active = header.activeRuns[0];
  // Live agent work outranks settled change counts while the panel is collapsed.
  const compactSummary = subagents.running ? `${subagents.running} ${subagents.running === 1 ? "subagent" : "subagents"} running`
    : changes.status === "ready" && changes.scope === "turn"
    ? `${changes.partial ? "Known " : ""}+${changes.additions} / −${changes.deletions} · ${changes.files} ${changes.files === 1 ? "file" : "files"}`
    : "Thread details";
  return <aside className="thread-insights mx-4 mt-3 w-72 max-w-[calc(100%-2rem)] shrink-0 self-end rounded-lg border border-border/70 bg-card/95 shadow-lg backdrop-blur" aria-label="Thread details">
    <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onToggle} aria-expanded={expanded} aria-controls={detailsId}>
      <FileCode2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-xs font-medium">{expanded ? "Thread details" : compactSummary}</span>
      {expanded ? <ChevronUp className="size-3.5 text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />}
    </button>
    {expanded && <div id={detailsId} className="thin-scrollbar max-h-[min(70vh,44rem)] space-y-3 overflow-y-auto border-t border-border/50 px-3.5 pb-3.5 pt-3 text-xs">
      <div className="space-y-1">
        <p className="truncate font-medium" title={conversation.title}>{conversation.title}</p>
        <p className="text-muted-foreground">{conversation.archivedAt ? "Settled" : active ? active.state.replaceAll("-", " ") : "Ready"} · {conversation.provider.model}</p>
        {conversation.workspace.branch && <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground"><GitBranch className="size-3 shrink-0" aria-hidden="true" /><span className="truncate" title={conversation.workspace.branch}>{conversation.workspace.branch}</span></p>}
      </div>
      <ThreadIdePicker key={conversation.id} workspace={conversation.workspace} />
      {subagents.agents.length > 0 && <ThreadSubagents summary={subagents} />}
      <div className="space-y-2 border-t border-border/50 pt-3">
        <p className="font-medium">Reviewed changes</p>
        {changes.status === "ready" ? <>
          <div className="flex items-center justify-between gap-2 tabular-nums"><span>{changes.files} {changes.files === 1 ? "file" : "files"}</span>{changes.scope === "turn" && changes.additions !== null && changes.deletions !== null && <DiffCounts counts={{ additions: changes.additions, deletions: changes.deletions }} />}</div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">{changes.scope === "workspace" ? "Workspace snapshot; thread-specific counts unavailable." : `${changes.partial ? "Partial totals from" : "Observed edits across"} ${changes.reviews} reviewed ${changes.reviews === 1 ? "turn" : "turns"}.`}</p>
        </> : <p className="text-muted-foreground">{changes.status === "pending" ? "Changes appear after a turn is reviewed." : "Review evidence is unavailable."}</p>}
        {hasOlderHistory && <Button variant="ghost" size="sm" className="h-7 px-0 text-[11px]" onClick={onLoadHistory}>Include earlier messages</Button>}
      </div>
      <div className="space-y-2 border-t border-border/50 pt-3">
        <div className="flex items-center gap-1.5 font-medium"><GitPullRequest className="size-3.5" aria-hidden="true" />Branch PR / MR<Button variant="ghost" size="icon" className="ml-auto size-6" aria-label="Refresh thread change request" onClick={onRefresh} disabled={request.status === "loading" || request.status === "unavailable"}><RefreshCcw className="size-3" aria-hidden="true" /></Button></div>
        {request.status === "loading" ? <p className="flex items-center gap-1.5 text-muted-foreground"><LoaderCircle className="size-3 motion-safe:animate-spin" aria-hidden="true" />Checking branch…</p>
          : request.status === "failed" ? <p role="status" className="text-muted-foreground">{request.message}</p>
          : request.status === "unavailable" ? <p className="text-muted-foreground">Available for connected repository threads.</p>
          : changeRequest?.pullRequestNumber ? <Button variant="ghost" className="h-8 w-full justify-start px-0 text-xs" disabled={!changeRequest.webUrl} onClick={() => { if (changeRequest.webUrl) void noraSystemClient.openExternalUrl(changeRequest.webUrl); }}>#{changeRequest.pullRequestNumber}<span className="ml-auto text-muted-foreground">{changeRequest.label}</span><ExternalLink className="size-3" aria-hidden="true" /></Button>
          : <p className="text-muted-foreground">No pull or merge request found.</p>}
      </div>
      {connectors && <ThreadConnectors connectors={connectors} />}
      {skills && <ThreadSkills skills={skills} />}
      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3 text-[10px] text-muted-foreground"><span className="truncate">{providerLabel} · {conversation.provider.permissionPolicy}</span><Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" disabled={busy || !canSettle} onClick={onSettleChange}>{conversation.archivedAt ? "Reopen" : "Settle"}</Button></div>
    </div>}
  </aside>;
}
