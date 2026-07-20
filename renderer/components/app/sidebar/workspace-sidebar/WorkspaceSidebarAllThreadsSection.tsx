import {
  WORKSPACE_SIDEBAR_ALL_THREADS_GROUP_BY_CYCLE,
  WORKSPACE_SIDEBAR_ALL_THREADS_GROUP_BY_OPTIONS
} from "@/components/app/logic/workspaceSidebarAllThreadsConstants";
import { getExternalHarnessThreadDisplayTitle } from "@/components/app/logic/externalHarnessThreads";
import {
  buildExternalHarnessThreadResumePayload,
  canResumeExternalHarnessThread
} from "@/components/app/logic/externalHarnessThreadResume";
import { useStatusBar } from "@/components/app/logic/statusBarContext";
import { formatTimestamp } from "@/components/app/logic/utils";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { WorkspaceSidebarAllThreadsSectionProps } from "@/components/app/types/workspaceSidebarAllThreadsSection.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Archive, ChevronDown, ChevronRight, LoaderCircle, SlidersHorizontal } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useState } from "react";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";

export const WorkspaceSidebarAllThreadsSection = ({
  allThreadsWorkspaceFilter,
  setAllThreadsWorkspaceFilter,
  allThreadsWorkspaceFilterOptions,
  allThreadsHarnessFilter,
  setAllThreadsHarnessFilter,
  allThreadsHarnessFilterOptions,
  allThreadsGroupBy,
  setAllThreadsGroupBy,
  isAllThreadsSectionCollapsed,
  setIsAllThreadsSectionCollapsed,
  filteredAllWorkspaceThreadEntries,
  allThreadsGroupSections,
  isLoadingAllThreads,
  onResumeThread,
  onArchiveThread,
  onThreadsChanged
}: WorkspaceSidebarAllThreadsSectionProps) => {
  const snapshot = useCanonicalAppSnapshot();
  const statusBar = useStatusBar();
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [openingThreadKey, setOpeningThreadKey] = useState<string | null>(null);
  const [archivingThreadKey, setArchivingThreadKey] = useState<string | null>(null);
  if (!snapshot) {
    return null;
  }

  const buildThreadKey = (workspaceId: string, toolId: string, primaryArtifactPath: string): string =>
    `${workspaceId}:${toolId}:${primaryArtifactPath}`;
  const applyWorkspaceFilter = (nextValue: string): void => {
    setAllThreadsWorkspaceFilter(nextValue);
    setIsControlsOpen(false);
  };
  const applyHarnessFilter = (nextValue: string): void => {
    setAllThreadsHarnessFilter(nextValue);
    setIsControlsOpen(false);
  };
  const applyGroupBy = (nextValue: typeof allThreadsGroupBy): void => {
    setAllThreadsGroupBy(nextValue);
    setIsControlsOpen(false);
  };

  return (
    <section className="workspace-sidebar-section-divider border-t">
      <div className="workspace-sidebar-section-header flex items-center justify-between px-4 py-1.5">
        <div className="workspace-sidebar-section-title">Threads</div>
        <div className="flex items-center gap-2">
          <div className="workspace-sidebar-section-detail">
            {isLoadingAllThreads && filteredAllWorkspaceThreadEntries.length === 0 ? "..." : filteredAllWorkspaceThreadEntries.length}
          </div>
          <Popover open={isControlsOpen} onOpenChange={setIsControlsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" aria-label="Filter and group threads">
                <SlidersHorizontal className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={10} collisionPadding={20} className="w-64">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-foreground">Filters</div>
                  <div>
                    <div className="mb-1 text-[11px] text-muted-foreground">Project</div>
                    <Select
                      className="h-8 text-xs"
                      value={allThreadsWorkspaceFilter}
                      onChange={(event) => applyWorkspaceFilter(event.target.value)}
                      aria-label="Filter threads by project"
                    >
                      {allThreadsWorkspaceFilterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] text-muted-foreground">Harness</div>
                    <Select
                      className="h-8 text-xs"
                      value={allThreadsHarnessFilter}
                      onChange={(event) => applyHarnessFilter(event.target.value)}
                      aria-label="Filter threads by harness"
                    >
                      {allThreadsHarnessFilterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="space-y-2 border-t border-border/60 pt-3">
                  <div className="text-xs font-medium text-foreground">Group by</div>
                  <div
                    role="radiogroup"
                    aria-label="Group threads"
                    className="flex w-full gap-1 rounded-full border border-border/60 bg-muted/40 p-1"
                    onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
                      const cycleIndex = WORKSPACE_SIDEBAR_ALL_THREADS_GROUP_BY_CYCLE.indexOf(allThreadsGroupBy);
                      if (cycleIndex < 0) {
                        return;
                      }
                      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                        event.preventDefault();
                        applyGroupBy(
                          WORKSPACE_SIDEBAR_ALL_THREADS_GROUP_BY_CYCLE[
                            (cycleIndex + 1) % WORKSPACE_SIDEBAR_ALL_THREADS_GROUP_BY_CYCLE.length
                          ]
                        );
                      }
                      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                        event.preventDefault();
                        applyGroupBy(
                          WORKSPACE_SIDEBAR_ALL_THREADS_GROUP_BY_CYCLE[
                            (cycleIndex - 1 + WORKSPACE_SIDEBAR_ALL_THREADS_GROUP_BY_CYCLE.length) %
                              WORKSPACE_SIDEBAR_ALL_THREADS_GROUP_BY_CYCLE.length
                          ]
                        );
                      }
                    }}
                  >
                    {WORKSPACE_SIDEBAR_ALL_THREADS_GROUP_BY_OPTIONS.map((option) => {
                      const isSelected = allThreadsGroupBy === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={isSelected ? 0 : -1}
                          onClick={() => applyGroupBy(option.value)}
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
            onClick={() => setIsAllThreadsSectionCollapsed((current) => !current)}
            aria-label={isAllThreadsSectionCollapsed ? "Expand threads section" : "Collapse threads section"}
          >
            {isAllThreadsSectionCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
      </div>
      {isAllThreadsSectionCollapsed ? null : (
        <div className="px-2 py-1.5">
          {isLoadingAllThreads && filteredAllWorkspaceThreadEntries.length === 0 ? (
            <div className="flex items-center gap-2 rounded-[4px] border border-dashed border-border/60 bg-background/30 px-2 py-1.5 text-[11px] text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading threads
            </div>
          ) : filteredAllWorkspaceThreadEntries.length ? (
            <div className="space-y-2">
              {allThreadsGroupSections.map((section) => (
                <div key={section.groupKey}>
                  {section.groupLabel ? (
                    <div className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                      {section.groupLabel}
                    </div>
                  ) : null}
                  <div>
                    {section.entries.map((entry) => {
                      const displayTitle = getExternalHarnessThreadDisplayTitle(entry.thread);
                      const threadKey = buildThreadKey(entry.workspaceId, entry.thread.toolId, entry.thread.primaryArtifactPath);
                      const isOpening = openingThreadKey === threadKey;
                      const isArchiving = archivingThreadKey === threadKey;
                      const isBusy = isOpening || isArchiving;
                      const canResume = canResumeExternalHarnessThread(entry.thread);
                      const secondaryLabel =
                        allThreadsGroupBy === "workspace"
                          ? entry.thread.toolLabel
                          : allThreadsGroupBy === "harness"
                            ? entry.workspaceName
                            : `${entry.workspaceName} · ${entry.thread.toolLabel}`;
                      return (
                        <div
                          key={threadKey}
                          className="group/thread flex h-8 w-full min-w-0 items-center rounded-[4px] pr-1 transition hover:bg-accent/40 focus-within:bg-accent/40"
                        >
                          <button
                            type="button"
                            disabled={isBusy || !canResume}
                            onClick={() => {
                              const tool = snapshot.agentCatalog.find((catalogEntry) => catalogEntry.id === entry.thread.toolId) ?? null;
                              const payload = buildExternalHarnessThreadResumePayload(entry.thread, tool, displayTitle);
                              if (!payload) {
                                return;
                              }
                              setOpeningThreadKey(threadKey);
                              const statusId = statusBar.beginStatus(`Resuming ${displayTitle}`, true);
                              void onResumeThread(entry.workspaceId, payload).finally(() => {
                                statusBar.endStatus(statusId);
                                setOpeningThreadKey(null);
                              });
                            }}
                            className="flex h-full min-w-0 flex-1 items-center gap-2 px-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-60"
                            aria-label={`Resume thread: ${displayTitle}`}
                            title={`${displayTitle}\n${entry.thread.conversationId}\n${entry.thread.primaryArtifactPath}`}
                          >
                            <AgentToolIcon
                              toolId={entry.thread.toolId}
                              label={entry.thread.toolLabel}
                              className="size-5 shrink-0"
                              imageClassName="size-4 rounded-sm"
                            />
                            <div className="flex min-w-0 flex-1 items-baseline gap-2">
                              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
                                {displayTitle}
                              </span>
                              <span className="shrink-0 text-[11px] text-muted-foreground/75">
                                {formatTimestamp(entry.thread.lastUpdatedAt)}
                              </span>
                            </div>
                            <span className="max-w-20 shrink-0 truncate text-[11px] text-muted-foreground/75">
                              {secondaryLabel}
                            </span>
                            {isOpening ? <LoaderCircle className="size-3.5 shrink-0 animate-spin text-primary" /> : null}
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0 opacity-0 transition-opacity group-hover/thread:opacity-100 group-focus-within/thread:opacity-100"
                            disabled={isBusy}
                            onClick={() => {
                              setArchivingThreadKey(threadKey);
                              const statusId = statusBar.beginStatus(`Archiving ${displayTitle}`, true);
                              void onArchiveThread(entry.workspaceId, entry.thread).finally(() => {
                                statusBar.endStatus(statusId);
                                setArchivingThreadKey(null);
                                onThreadsChanged();
                              });
                            }}
                            aria-label={`Archive thread: ${displayTitle}`}
                          >
                            {isArchiving ? (
                              <LoaderCircle className="size-3.5 animate-spin text-primary" />
                            ) : (
                              <Archive className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[4px] border border-dashed border-border/60 bg-background/30 px-2 py-1.5 text-[11px] text-muted-foreground">
              No threads match the selected filters.
            </div>
          )}
        </div>
      )}
    </section>
  );
};
