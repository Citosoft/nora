import {
  countSelectedAgentContextGroups,
  countSelectedAgentContextGroupsForSource,
  estimateSelectedAgentContext,
  isAgentContextGroupSelected,
  toggleAgentContextGroupSelection
} from "@/components/app/logic/agentContextSelections";
import { formatTimestamp } from "@/components/app/logic/utils";
import type { AgentContextSourceSummary, AgentContextSelection } from "@shared/appTypes";
import { LoaderCircle } from "lucide-react";

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
  onChange
}: {
  sources: AgentContextSourceSummary[];
  selections: AgentContextSelection[];
  isLoading: boolean;
  emptyMessage: string;
  onChange: (next: AgentContextSelection[]) => void;
}) {
  const selectedCount = countSelectedAgentContextGroups(sources, selections);
  const selectedEstimate = estimateSelectedAgentContext(sources, selections);
  const showLargeWarning = selectedEstimate.estimatedTokens >= 2000;
  const sortedSources = [...sources]
    .sort((left, right) => compareOptionalTimestampsDescending(left.lastUpdatedAt, right.lastUpdatedAt))
    .map((source) => ({
      ...source,
      entryGroups: [...source.entryGroups].sort((left, right) =>
        compareOptionalTimestampsDescending(left.lastUpdatedAt, right.lastUpdatedAt)
      )
    }));

  return (
    <div className="rounded-[4px] border border-border/70 bg-background/30">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div>
          <div className="text-sm font-medium text-foreground">Agent context</div>
          <div className="text-xs text-muted-foreground">
            Select grouped agent conversations to share with the new agent. Newest sessions appear first.
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>{selectedCount} session{selectedCount === 1 ? "" : "s"} selected</div>
          <div>{selectedEstimate.characters.toLocaleString()} chars · ~{selectedEstimate.estimatedTokens.toLocaleString()} tokens</div>
        </div>
      </div>
      {showLargeWarning ? (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
          Large context selection. Consider trimming it before launch if the target agent should stay focused.
        </div>
      ) : null}
      <div className="max-h-72 overflow-auto p-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin text-primary" />
            Loading agent context
          </div>
        ) : !sources.length ? (
          <div className="rounded-[4px] border border-dashed border-border/60 bg-background/30 px-3 py-3 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSources.map((source) => (
              <div key={source.agentId} className="rounded-[4px] border border-border/60 bg-card/40">
                <div className="border-b border-border/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{source.agentName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {source.toolLabel} · Updated {formatTimestamp(source.lastUpdatedAt)} · {source.entryCount} entr{source.entryCount === 1 ? "y" : "ies"} · {source.estimate.characters.toLocaleString()} chars
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {countSelectedAgentContextGroupsForSource(source, selections)} selected
                    </div>
                  </div>
                </div>
                <div className="space-y-2 p-3">
                  {source.entryGroups.map((group) => {
                    const selected = isAgentContextGroupSelected(selections, source.agentId, group);
                    return (
                      <label
                        key={group.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-[4px] border px-3 py-2 transition ${
                          selected
                            ? "border-primary/50 bg-primary/10"
                            : "border-border/60 bg-background/30 hover:bg-accent/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 rounded-[4px] border border-input bg-background"
                          checked={selected}
                          onChange={() => onChange(toggleAgentContextGroupSelection(selections, source.agentId, group))}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{group.title}</span>
                              <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                {group.entryCount} entr{group.entryCount === 1 ? "y" : "ies"}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                ~{group.estimate.estimatedTokens.toLocaleString()} tok
                              </span>
                            </div>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {formatTimestamp(group.lastUpdatedAt)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">{group.latestPreview}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
