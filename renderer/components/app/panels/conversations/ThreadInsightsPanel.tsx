import { ChevronDown, ChevronUp, FileCode2, GitBranch } from "lucide-react";
import { formatChangeTotals } from "@/components/app/logic/thread-workspace/insights";
import type { ThreadInsightsPanelProps } from "@/components/app/types/threadInsights.types";
import { Button } from "@/components/ui/button";
import { useId } from "react";
import { ThreadIdePicker } from "./ThreadIdePicker";
import { DiffCounts } from "./DiffCounts";
import { ThreadConnectors } from "./ThreadConnectors";
import { NoraThreadConnectors } from "./NoraThreadConnectors";
import { connectorSubjectOf } from "@shared/connectors/access";
import { ThreadSubagents } from "./ThreadSubagents";
import { ThreadSkills } from "./ThreadSkills";
import { ThreadBranchSection } from "./ThreadBranchSection";
import { ThreadOutputs } from "./ThreadOutputs";
import { ThreadPinnedMessages } from "./ThreadPinnedMessages";
import { ThreadInsightsSectionsContextMenu } from "./ThreadInsightsSectionsContextMenu";
import { ThreadInsightsSectionsDropdown } from "./ThreadInsightsSectionsDropdown";
import { useThreadInsightsSections } from "@/components/app/hooks/useThreadInsightsSections";

export function ThreadInsightsPanel({ header, providerLabel, connectors, skills, changes, subagents, outputs, branch, pins, expanded, busy, canSettle, hasOlderHistory, onToggle, onLoadHistory, onOpenOutput, onSettleChange }: ThreadInsightsPanelProps) {
  const detailsId = useId();
  const sections = useThreadInsightsSections();
  const show = sections.isVisible;
  const conversation = header.conversation;
  const active = header.activeRuns[0];
  const branchChanges = branch.changes.status === "ready" ? branch.changes.value : null;
  // Live agent work outranks change counts while the panel is collapsed; the checkout's branch diff outranks turn evidence.
  const compactSummary = subagents.running ? `${subagents.running} ${subagents.running === 1 ? "subagent" : "subagents"} running`
    : branchChanges ? formatChangeTotals(branchChanges, branchChanges.partial)
    : changes.status === "ready" && changes.scope === "turn" && changes.additions !== null && changes.deletions !== null
    ? formatChangeTotals({ files: changes.files, additions: changes.additions, deletions: changes.deletions }, changes.partial)
    : "Thread details";
  return <ThreadInsightsSectionsContextMenu visibility={sections}><aside className="thread-insights mx-4 mt-3 w-72 max-w-[calc(100%-2rem)] shrink-0 self-end rounded-lg border border-border/70 bg-card/95 shadow-lg backdrop-blur" aria-label="Thread details">
    <div className="flex items-center gap-0.5 pr-1.5">
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-3 pl-3.5 pr-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onToggle} aria-expanded={expanded} aria-controls={detailsId}>
        <FileCode2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{expanded ? "Thread details" : compactSummary}</span>
        {expanded ? <ChevronUp className="size-3.5 text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />}
      </button>
      <ThreadInsightsSectionsDropdown visibility={sections} />
    </div>
    {expanded && <div id={detailsId} className="thin-scrollbar max-h-[min(70vh,44rem)] space-y-3 overflow-y-auto border-t border-border/50 px-3.5 pb-3.5 pt-3 text-xs [&>*:first-child]:border-t-0 [&>*:first-child]:pt-0">
      {show("overview") && <div className="space-y-1">
        <p className="truncate font-medium" title={conversation.title}>{conversation.title}</p>
        <p className="text-muted-foreground">{conversation.archivedAt ? "Settled" : active ? active.state.replaceAll("-", " ") : "Ready"} · {conversation.provider.model}</p>
        {conversation.workspace.branch && <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground"><GitBranch className="size-3 shrink-0" aria-hidden="true" /><span className="truncate" title={conversation.workspace.branch}>{conversation.workspace.branch}</span></p>}
      </div>}
      {show("pinned") && <ThreadPinnedMessages pins={pins} />}
      {show("ide") &&<ThreadIdePicker key={conversation.id} workspace={conversation.workspace} />}
      {show("subagents") && subagents.agents.length > 0 && <ThreadSubagents summary={subagents} />}
      {show("changes") && <div className="space-y-2 border-t border-border/50 pt-3">
        <p className="font-medium">Reviewed changes</p>
        {changes.status === "ready" ? <>
          <div className="flex items-center justify-between gap-2 tabular-nums"><span>{changes.files} {changes.files === 1 ? "file" : "files"}</span>{changes.scope === "turn" && changes.additions !== null && changes.deletions !== null && <DiffCounts counts={{ additions: changes.additions, deletions: changes.deletions }} />}</div>
          <p className="text-[9px] leading-relaxed text-muted-foreground">{changes.scope === "workspace" ? "Workspace snapshot; thread-specific counts unavailable." : `${changes.partial ? "Partial totals from" : "Observed edits across"} ${changes.reviews} reviewed ${changes.reviews === 1 ? "turn" : "turns"}.`}</p>
        </> : <p className="text-muted-foreground">{changes.status === "pending" ? "Changes appear after a turn is reviewed." : "Review evidence is unavailable."}</p>}
        {hasOlderHistory && <Button variant="ghost" size="sm" className="h-7 px-0 text-[10px]" onClick={onLoadHistory}>Include earlier messages</Button>}
      </div>}
      {show("outputs") && <ThreadOutputs outputs={outputs} partial={hasOlderHistory} onOpen={onOpenOutput} />}
      {show("branch") && <ThreadBranchSection branch={branch} />}
      {show("connectors") && connectors && <ThreadConnectors connectors={connectors} />}
      {/* Group and direct chats run on Nora's coordinators, which get no connectors. */}
      {show("nora-connectors") && !conversation.group && !conversation.direct && <NoraThreadConnectors subject={connectorSubjectOf(conversation)} />}
      {show("skills") && skills && <ThreadSkills skills={skills} />}
      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3 text-[9px] text-muted-foreground"><span className="truncate">{providerLabel} · {conversation.provider.permissionPolicy}</span><Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" disabled={busy || !canSettle} onClick={onSettleChange}>{conversation.archivedAt ? "Reopen" : "Settle"}</Button></div>
    </div>}
  </aside></ThreadInsightsSectionsContextMenu>;
}
