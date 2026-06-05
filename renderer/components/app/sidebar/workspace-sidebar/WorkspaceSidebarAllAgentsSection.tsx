import { isAgentBusyAt } from "@/components/app/logic/agentBusy";
import {
  WORKSPACE_SIDEBAR_ALL_AGENTS_GROUP_BY_CYCLE,
  WORKSPACE_SIDEBAR_ALL_AGENTS_GROUP_BY_OPTIONS
} from "@/components/app/logic/workspaceSidebarAllAgentsConstants";
import {
  getWorkspaceSidebarPullRequestDotClass,
  workspaceSidebarHasPullRequestState
} from "@/components/app/logic/workspaceSidebarPresentation";
import { BusyIndicator } from "@/components/app/shared/BusyIndicator";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { AllAgentsPrFilter } from "@/components/app/types/workspaceSidebarAllAgents.types";
import type { WorkspaceSidebarAllAgentsSectionProps } from "@/components/app/types/workspaceSidebarAllAgentsSection.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";

export const WorkspaceSidebarAllAgentsSection = ({
  focusedAgent,
  now,
  allAgentsWorkspaceFilter,
  setAllAgentsWorkspaceFilter,
  allAgentsWorkspaceFilterOptions,
  allAgentsPrFilter,
  setAllAgentsPrFilter,
  allAgentsGroupBy,
  setAllAgentsGroupBy,
  isAllAgentsSectionCollapsed,
  setIsAllAgentsSectionCollapsed,
  filteredAllWorkspaceAgentEntries,
  allAgentsGroupSections,
  openAgentSessionMenu,
  onFocusAgent,
  onFocusWorkspaceAgent
}: WorkspaceSidebarAllAgentsSectionProps) => {
  const snapshot = useCanonicalAppSnapshot();
  if (!snapshot) {
    return null;
  }

  return (
    <section className="border-t border-border/60">
      <div className="flex items-center justify-between bg-background/70 px-4 py-2">
        <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Agents</div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">{filteredAllWorkspaceAgentEntries.length}</div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" aria-label="Filter and group agents">
                <SlidersHorizontal className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={10} collisionPadding={20} className="w-64">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-foreground">Filters</div>
                  <div>
                    <div className="mb-1 text-[11px] text-muted-foreground">Workspace</div>
                    <Select
                      className="h-8 text-xs"
                      value={allAgentsWorkspaceFilter}
                      onChange={(event) => setAllAgentsWorkspaceFilter(event.target.value)}
                      aria-label="Filter agents by workspace"
                    >
                      {allAgentsWorkspaceFilterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] text-muted-foreground">PR status</div>
                    <Select
                      className="h-8 text-xs"
                      value={allAgentsPrFilter}
                      onChange={(event) => setAllAgentsPrFilter(event.target.value as AllAgentsPrFilter)}
                      aria-label="Filter agents by pull request status"
                    >
                      <option value="all">All PR statuses</option>
                      <option value="with_pr">Has PR</option>
                      <option value="none">No PR</option>
                      <option value="open">Open PR</option>
                      <option value="draft">Draft PR</option>
                      <option value="merged">Merged PR</option>
                      <option value="closed">Closed PR</option>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2 border-t border-border/60 pt-3">
                  <div className="text-xs font-medium text-foreground">Group by</div>
                  <div
                    role="radiogroup"
                    aria-label="Group agents"
                    className="flex w-full gap-1 rounded-full border border-border/60 bg-muted/40 p-1"
                    onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
                      const cycleIndex = WORKSPACE_SIDEBAR_ALL_AGENTS_GROUP_BY_CYCLE.indexOf(allAgentsGroupBy);
                      if (cycleIndex < 0) {
                        return;
                      }
                      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                        event.preventDefault();
                        setAllAgentsGroupBy(
                          WORKSPACE_SIDEBAR_ALL_AGENTS_GROUP_BY_CYCLE[
                            (cycleIndex + 1) % WORKSPACE_SIDEBAR_ALL_AGENTS_GROUP_BY_CYCLE.length
                          ]
                        );
                      }
                      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                        event.preventDefault();
                        setAllAgentsGroupBy(
                          WORKSPACE_SIDEBAR_ALL_AGENTS_GROUP_BY_CYCLE[
                            (cycleIndex - 1 + WORKSPACE_SIDEBAR_ALL_AGENTS_GROUP_BY_CYCLE.length) %
                              WORKSPACE_SIDEBAR_ALL_AGENTS_GROUP_BY_CYCLE.length
                          ]
                        );
                      }
                    }}
                  >
                    {WORKSPACE_SIDEBAR_ALL_AGENTS_GROUP_BY_OPTIONS.map((option) => {
                      const isSelected = allAgentsGroupBy === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={isSelected ? 0 : -1}
                          onClick={() => setAllAgentsGroupBy(option.value)}
                          className={cn(
                            "min-w-0 flex-1 rounded-full px-1.5 py-1.5 text-center text-[11px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            isSelected
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setIsAllAgentsSectionCollapsed((current) => !current)}
            aria-label={isAllAgentsSectionCollapsed ? "Expand agents section" : "Collapse agents section"}
          >
            {isAllAgentsSectionCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
      </div>
      {isAllAgentsSectionCollapsed ? null : (
        <div className="px-2 py-1.5">
          {filteredAllWorkspaceAgentEntries.length ? (
            <div className="space-y-2">
              {allAgentsGroupSections.map((section) => (
                <div key={section.groupKey}>
                  {section.groupLabel ? (
                    <div className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                      {section.groupLabel}
                    </div>
                  ) : null}
                  <div>
                    {section.entries.map((entry) => {
                      const isBusy = isAgentBusyAt(entry.agent, now);
                      const hasPr = workspaceSidebarHasPullRequestState(entry.pullRequestStatus?.state);
                      const isFocusedAgent =
                        entry.workspaceId === snapshot.project?.id && focusedAgent?.id === entry.agent.id;
                      const secondaryLabel =
                        allAgentsGroupBy === "workspace"
                          ? entry.agent.branch
                          : `${entry.workspaceName} · ${entry.agent.branch}`;
                      return (
                        <button
                          key={entry.agent.id}
                          type="button"
                          onContextMenu={(event) => {
                            const prUrl =
                              entry.pullRequestStatus &&
                              workspaceSidebarHasPullRequestState(entry.pullRequestStatus.state)
                                ? (entry.pullRequestStatus.webUrl ?? null)
                                : null;
                            openAgentSessionMenu(entry.workspaceId, entry.agent, prUrl, event);
                          }}
                          onClick={() =>
                            entry.workspaceId === snapshot.project?.id
                              ? onFocusAgent(entry.agent.id)
                              : void onFocusWorkspaceAgent(entry.workspaceId, entry.agent.id)
                          }
                          className={cn(
                            "flex w-full min-w-0 items-center gap-1.5 rounded-[4px] px-2 py-1 text-left transition",
                            isFocusedAgent ? "bg-primary/10" : "hover:bg-accent/40"
                          )}
                        >
                          <AgentToolIcon
                            toolId={entry.agent.toolId}
                            label={entry.agent.toolLabel}
                            className="size-5 shrink-0"
                            imageClassName="size-3.5 rounded-sm"
                          />
                          <div className="min-w-0 flex-1 truncate text-[12px] leading-tight">
                            <span className="font-medium text-foreground">{entry.agent.name}</span>
                            <span className="text-muted-foreground"> · {secondaryLabel}</span>
                          </div>
                          {isBusy ? <BusyIndicator className="size-3 shrink-0" /> : null}
                          {hasPr && entry.pullRequestStatus ? (
                            <Tooltip
                              content={
                                entry.pullRequestStatus.pullRequestNumber
                                  ? `PR status: ${entry.pullRequestStatus.label} (#${entry.pullRequestStatus.pullRequestNumber})`
                                  : `PR status: ${entry.pullRequestStatus.label}`
                              }
                              side="right"
                            >
                              <span
                                className={cn(
                                  "inline-flex size-1.5 shrink-0 rounded-full",
                                  getWorkspaceSidebarPullRequestDotClass(entry.pullRequestStatus.state)
                                )}
                                aria-label={`Pull request status: ${entry.pullRequestStatus.label}`}
                              />
                            </Tooltip>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[4px] border border-dashed border-border/60 bg-background/30 px-2 py-1.5 text-[11px] text-muted-foreground">
              No agents match the selected filters.
            </div>
          )}
        </div>
      )}
    </section>
  );
};
