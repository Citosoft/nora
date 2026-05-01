import {
  countSelectedAgentContextGroups,
  countSelectedAgentContextGroupsForSource,
  estimateSelectedAgentContext,
  isAgentContextGroupSelected,
  mergeAgentContextPickerSources,
  toggleAgentContextGroupSelection
} from "@/components/app/logic/agentContextSelections";
import { formatTimestamp } from "@/components/app/logic/utils";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { cn } from "@/lib/utils";
import type { AgentContextSourceSummary, AgentContextSelection } from "@shared/appTypes";
import { LoaderCircle } from "lucide-react";
import { useMemo } from "react";

function compareOptionalTimestampsDescending(left: string | null, right: string | null): number {
  const leftTimestamp = left ? Date.parse(left) : 0;
  const rightTimestamp = right ? Date.parse(right) : 0;
  return rightTimestamp - leftTimestamp;
}

export function AgentContextPicker({
  sources,
  selections,
  isLoading,
  emptyMessage,
  onChange,
  surface = "card"
}: {
  sources: AgentContextSourceSummary[];
  selections: AgentContextSelection[];
  isLoading: boolean;
  emptyMessage: string;
  onChange: (next: AgentContextSelection[]) => void;
  surface?: "card" | "flush";
}) {
  const isFlush = surface === "flush";
  const pickerSources = useMemo(() => mergeAgentContextPickerSources(sources, selections), [sources, selections]);
  const selectedCount = countSelectedAgentContextGroups(pickerSources, selections);
  const selectedEstimate = estimateSelectedAgentContext(pickerSources, selections);
  const showLargeWarning = selectedEstimate.estimatedTokens >= 2000;
  const sortedSources = [...pickerSources]
    .sort((left, right) => compareOptionalTimestampsDescending(left.lastUpdatedAt, right.lastUpdatedAt))
    .map((source) => ({
      ...source,
      entryGroups: [...source.entryGroups].sort((left, right) =>
        compareOptionalTimestampsDescending(left.lastUpdatedAt, right.lastUpdatedAt)
      )
    }));

  const header = (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        !isFlush && "border-b border-border/60 px-4 py-3",
        isFlush && "px-0.5"
      )}
    >
      <div className="min-w-0">
        {!isFlush ? (
          <>
            <div className="text-sm font-medium text-foreground">Agent context</div>
            <div className="text-xs text-muted-foreground">
              Select grouped agent conversations or local CLI transcripts to share with the new agent. Newest sessions
              appear first.
            </div>
          </>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Newest sessions first. Toggle conversation groups or local CLI transcripts to attach to this launch.
          </p>
        )}
      </div>
      <div className="shrink-0 text-left text-xs text-muted-foreground sm:text-right">
        <div>
          {selectedCount} session{selectedCount === 1 ? "" : "s"} selected
        </div>
        <div className="tabular-nums">
          {selectedEstimate.characters.toLocaleString()} chars · ~{selectedEstimate.estimatedTokens.toLocaleString()} tokens
        </div>
      </div>
    </div>
  );

  const warning = showLargeWarning ? (
    <div
      className={cn(
        "text-xs text-amber-950 dark:text-amber-100",
        isFlush ? "rounded-md bg-amber-500/15 px-3 py-2" : "border-b border-amber-500/20 bg-amber-500/10 px-4 py-2"
      )}
    >
      Large context selection. Consider trimming it before launch if the target agent should stay focused.
    </div>
  ) : null;

  const listBody = isLoading ? (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin text-primary" />
      Loading agent context
    </div>
  ) : !pickerSources.length ? (
    <p className={cn("text-sm text-muted-foreground", isFlush ? "py-10 text-center" : "rounded-[4px] border border-dashed border-border/60 bg-background/30 px-3 py-3")}>
      {emptyMessage}
    </p>
  ) : (
    <div className={cn(isFlush ? "space-y-5" : "space-y-3")}>
      {sortedSources.map((source) => (
        <div
          key={source.agentId}
          className={cn(
            isFlush ? "space-y-2 border-b border-border/25 pb-5 last:border-b-0 last:pb-0" : "rounded-[4px] border border-border/60 bg-card/40"
          )}
        >
          <div className={cn(isFlush ? "px-0.5" : "border-b border-border/60 px-3 py-2")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-stretch gap-2">
                <div className="flex shrink-0 items-center pt-0.5" aria-hidden>
                  <AgentToolIcon
                    toolId={source.toolId}
                    label={source.toolLabel}
                    className="size-8 shrink-0"
                    imageClassName="size-5 rounded-sm"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{source.agentName}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {source.agentId.startsWith("external-harness:") ? `${source.toolLabel} · local CLI` : source.toolLabel} ·{" "}
                    {formatTimestamp(source.lastUpdatedAt)} · {source.entryCount} entr{source.entryCount === 1 ? "y" : "ies"} ·{" "}
                    {source.estimate.characters.toLocaleString()} chars
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                {countSelectedAgentContextGroupsForSource(source, selections)} selected
              </div>
            </div>
          </div>
          <div className={cn("space-y-2", !isFlush && "p-3")}>
            {source.entryGroups.map((group) => {
              const selected = isAgentContextGroupSelected(selections, source.agentId, group);
              return (
                <label
                  key={group.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 transition",
                    selected
                      ? isFlush
                        ? "bg-primary/12 ring-1 ring-primary/30"
                        : "border border-primary/50 bg-primary/10"
                      : isFlush
                        ? "hover:bg-muted/50"
                        : "border border-border/60 bg-background/30 hover:bg-accent/40"
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 rounded-[4px] border border-input bg-background"
                    checked={selected}
                    onChange={() => onChange(toggleAgentContextGroupSelection(selections, source.agentId, group))}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm font-medium text-foreground">{group.title}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {group.entryCount} entr{group.entryCount === 1 ? "y" : "ies"} · ~{group.estimate.estimatedTokens.toLocaleString()} tok
                        </span>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{formatTimestamp(group.lastUpdatedAt)}</span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{group.latestPreview}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={cn(
        isFlush ? "flex flex-col gap-3" : "rounded-[4px] border border-border/70 bg-background/30"
      )}
    >
      {header}
      {warning}
      <div
        className={cn(
          "max-h-72 overflow-y-auto",
          isFlush ? "rounded-lg bg-muted/20 px-3 py-3 dark:bg-muted/10" : "p-3"
        )}
      >
        {listBody}
      </div>
    </div>
  );
}
