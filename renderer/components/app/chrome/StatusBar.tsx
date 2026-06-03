import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { noraToolingClient } from "@/components/app/clients/noraToolingClient";
import { createAgentSkillCatalogMap, getAgentSkillCatalogSummaries } from "@/components/app/logic/agentSkills";
import { getEnabledStatusBarTools, getUsagePollingToolIds } from "@/components/app/logic/statusBarTools";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { StatusBarEntry } from "@/components/app/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AgentCatalogEntry, AgentSkillCatalog, ToolUsageInfo } from "@shared/appTypes";
import { GitBranch, LoaderCircle, RefreshCcw, Sparkles, UserRound, Wrench } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface StatusBarProps {
  entries: StatusBarEntry[];
  tools?: AgentCatalogEntry[];
  agentSkillCatalogs?: AgentSkillCatalog[];
  activeWorkspaceBranch?: string | null;
  activeWorkspaceWorktreeName?: string | null;
  onInstallTool?: (toolId: string) => Promise<void> | void;
  onSwitchToolAccount?: (toolId: string) => Promise<void> | void;
  onOpenSkillsSettings?: () => void;
}

const FOOTER_USAGE_POLL_INTERVAL_MS = 5 * 60 * 1000;

type UsageWindowSummary = {
  raw: string;
  percentLeft: number | null;
  resetAt: string | null;
};

type UsageSummary = {
  hourly: UsageWindowSummary;
  weekly: UsageWindowSummary;
  account: string;
};

function formatAbbreviatedRemainingUsage(summary: UsageSummary): string | null {
  const parts: string[] = [];
  if (summary.hourly.percentLeft !== null) {
    parts.push(`H${summary.hourly.percentLeft}%`);
  }
  if (summary.weekly.percentLeft !== null) {
    parts.push(`W${summary.weekly.percentLeft}%`);
  }
  if (!parts.length) {
    return null;
  }
  return parts.join(" ");
}

function extractPercentLeft(line: string | null): number | null {
  if (!line) {
    return null;
  }
  const match = line.match(/(\d{1,3})%\s*left/i);
  if (!match?.[1]) {
    return null;
  }
  const value = Number.parseInt(match[1], 10);
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.min(100, value));
}

function extractResetAt(line: string | null): string | null {
  if (!line) {
    return null;
  }
  const match = line.match(/\(?\s*resets?\s+([^)]+)\)?/i);
  return match?.[1]?.trim() || null;
}

function buildWindowSummary(raw: string | null): UsageWindowSummary {
  return {
    raw: raw ?? "Not reported",
    percentLeft: extractPercentLeft(raw),
    resetAt: extractResetAt(raw)
  };
}

function extractUsageSummary(usageInfo: ToolUsageInfo | null): UsageSummary {
  if (!usageInfo) {
    return {
      hourly: buildWindowSummary(null),
      weekly: buildWindowSummary(null),
      account: "Unknown"
    };
  }

  const lines = [usageInfo.title, ...usageInfo.lines].map((line) => line.trim()).filter(Boolean);
  const hourlyLine = lines.find((line) =>
    (/hour|hourly|hr/i.test(line) && /(limit|remaining|used|usage|quota)/i.test(line))
    || /^5h limit:/i.test(line)
    || /^\d+h limit:/i.test(line)
  ) ?? null;
  const weeklyLine = lines.find((line) => /week|weekly|7d/i.test(line) && /(limit|remaining|used|usage|quota)/i.test(line)) ?? null;
  const emailLine = lines.find((line) => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(line)) ?? null;
  const labeledAccountLine = lines.find((line) => /logged in as|account|user/i.test(line)) ?? null;
  const accountLine = emailLine ?? labeledAccountLine;
  const accountMatch = accountLine?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;

  return {
    hourly: buildWindowSummary(hourlyLine),
    weekly: buildWindowSummary(weeklyLine),
    account: accountMatch ?? accountLine ?? "Unknown"
  };
}

export function StatusBar({
  entries,
  tools = [],
  agentSkillCatalogs = [],
  activeWorkspaceBranch = null,
  activeWorkspaceWorktreeName = null,
  onInstallTool,
  onSwitchToolAccount,
  onOpenSkillsSettings
}: StatusBarProps) {
  const activeEntry = entries[entries.length - 1] ?? null;
  const [openToolId, setOpenToolId] = useState<string | null>(null);
  const [skillsPopoverOpen, setSkillsPopoverOpen] = useState(false);
  const [usageByToolId, setUsageByToolId] = useState<Record<string, ToolUsageInfo | null>>({});
  const [usageLoadingToolId, setUsageLoadingToolId] = useState<string | null>(null);
  const [actionToolId, setActionToolId] = useState<string | null>(null);
  const [toolErrorById, setToolErrorById] = useState<Record<string, string | null>>({});
  const visibleTools = useMemo(() => getEnabledStatusBarTools(tools), [tools]);
  const skillCatalogByToolId = useMemo(
    () => createAgentSkillCatalogMap(agentSkillCatalogs),
    [agentSkillCatalogs]
  );
  const skillCatalogSummaries = useMemo(
    () => getAgentSkillCatalogSummaries(visibleTools, skillCatalogByToolId),
    [visibleTools, skillCatalogByToolId]
  );
  const availableSkillCount = useMemo(
    () => skillCatalogSummaries.reduce((total, summary) => total + summary.catalog.skills.length, 0),
    [skillCatalogSummaries]
  );
  const usagePollingToolIds = useMemo(() => getUsagePollingToolIds(visibleTools), [visibleTools]);

  const loadToolUsage = useCallback(async (toolId: string): Promise<void> => {
    const tool = visibleTools.find((item) => item.id === toolId);
    if (!tool || !tool.detected) {
      console.log("[nora renderer] usage fetch skipped", {
        toolId,
        reason: !tool ? "unknown-tool" : "not-detected"
      });
      return;
    }
    if (!tool.supportsUsageStatus) {
      console.log("[nora renderer] usage fetch skipped", {
        toolId,
        reason: "unsupported"
      });
      return;
    }

    console.log("[nora renderer] usage fetch started", {
      toolId,
      toolLabel: tool.label
    });
    setUsageLoadingToolId(toolId);
    try {
      const usage = await noraToolingClient.getToolUsage(toolId);
      console.log("[nora renderer] usage fetch completed", {
        toolId,
        status: usage?.status ?? null,
        lineCount: usage?.lines.length ?? 0,
        title: usage?.title ?? null
      });
      setUsageByToolId((current) => ({
        ...current,
        [toolId]: usage
      }));
      setToolErrorById((current) => ({
        ...current,
        [toolId]: null
      }));
    } catch (error: unknown) {
      console.error("[nora renderer] usage fetch failed", {
        toolId,
        error: error instanceof Error ? error.message : String(error)
      });
      setToolErrorById((current) => ({
        ...current,
        [toolId]: error instanceof Error ? error.message : "Unable to load usage."
      }));
    } finally {
      setUsageLoadingToolId((current) => (current === toolId ? null : current));
    }
  }, [visibleTools]);

  const switchToolAccount = useCallback(async (toolId: string, options: { refreshUsage: boolean }): Promise<void> => {
    if (!onSwitchToolAccount) {
      return;
    }

    setActionToolId(toolId);
    setToolErrorById((current) => ({
      ...current,
      [toolId]: null
    }));
    try {
      await onSwitchToolAccount(toolId);
      if (options.refreshUsage) {
        await loadToolUsage(toolId);
      }
    } catch {
      // The app-level switch flow already routes this through the shared error dialog.
    } finally {
      setActionToolId((current) => (current === toolId ? null : current));
    }
  }, [loadToolUsage, onSwitchToolAccount]);

  useEffect(() => {
    if (!usagePollingToolIds.length) {
      return;
    }

    let cancelled = false;
    let isPolling = false;
    const pollUsage = async (): Promise<void> => {
      if (isPolling) {
        return;
      }
      isPolling = true;
      try {
        for (const toolId of usagePollingToolIds) {
          if (cancelled) {
            break;
          }
          await loadToolUsage(toolId);
        }
      } finally {
        isPolling = false;
      }
    };

    void pollUsage();
    const interval = window.setInterval(() => {
      void pollUsage();
    }, FOOTER_USAGE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadToolUsage, usagePollingToolIds]);

  return (
    <div className="workspace-shell-footer-surface flex h-8 items-center justify-between border-t border-border/60 bg-card/95 px-3 text-xs text-muted-foreground">
      <div className="flex min-w-0 items-center gap-3">
        {activeEntry?.loading ? <LoaderCircle className="size-3.5 animate-spin text-primary" /> : null}
        <div className="truncate">{activeEntry?.message ?? "Ready"}</div>
        <div className="flex items-center gap-1.5">
          {visibleTools.map((tool) => {
            const usageInfo = usageByToolId[tool.id] ?? null;
            const summary = extractUsageSummary(usageInfo);
            const abbreviatedUsage = formatAbbreviatedRemainingUsage(summary);
            const isUsageLoading = usageLoadingToolId === tool.id;
            const isActionLoading = actionToolId === tool.id;
            const usageDashboardUrl = tool.usageDashboardUrl;
            const isAuthUnavailable = usageInfo?.status === "unavailable";
            const installActionLabel = tool.installStatus === "running" || isActionLoading ? "Installing..." : "Install";
            const accountActionLabel = isActionLoading
              ? (isAuthUnavailable ? "Logging in..." : "Switching...")
              : (isAuthUnavailable ? "Login" : "Switch account");

            const trigger = (
              <button
                type="button"
                title={tool.label}
                className="flex items-center gap-1 rounded-[4px] bg-transparent px-1 py-0.5 transition hover:bg-accent/50"
                aria-label={tool.label}
              >
                <AgentToolIcon toolId={tool.id} label={tool.label} className="size-5 rounded-[3px] bg-transparent" imageClassName="size-4 rounded-none" />
                {abbreviatedUsage ? (
                  <span
                    className="text-[10px] font-medium tabular-nums text-muted-foreground"
                    title={`${tool.label} remaining usage: ${abbreviatedUsage}`}
                  >
                    {abbreviatedUsage}
                  </span>
                ) : null}
              </button>
            );

            return (
              <Popover
                key={tool.id}
                open={openToolId === tool.id}
                onOpenChange={(open) => {
                  setSkillsPopoverOpen(false);
                  setOpenToolId(open ? tool.id : null);
                  if (open && tool.supportsUsageStatus) {
                    void loadToolUsage(tool.id);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  {trigger}
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="footer-tool-status-popover w-80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AgentToolIcon toolId={tool.id} label={tool.label} className="size-6 rounded-[4px]" imageClassName="size-4" />
                      <div className="text-sm font-medium text-foreground">{tool.label}</div>
                    </div>
                    {isUsageLoading ? <LoaderCircle className="size-3.5 animate-spin text-primary" /> : null}
                  </div>
                  {!tool.detected ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-center"
                        onClick={() => {
                          if (!onInstallTool) {
                            return;
                          }
                          setActionToolId(tool.id);
                          setToolErrorById((current) => ({
                            ...current,
                            [tool.id]: null
                          }));
                          Promise.resolve(onInstallTool(tool.id))
                            .catch((error: unknown) => {
                              setToolErrorById((current) => ({
                                ...current,
                                [tool.id]: error instanceof Error ? error.message : "Unable to install CLI."
                              }));
                            })
                            .finally(() => {
                              setActionToolId((current) => (current === tool.id ? null : current));
                            });
                        }}
                        disabled={tool.installStatus === "running" || isActionLoading || !onInstallTool}
                      >
                        {tool.installStatus === "running" || isActionLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Wrench className="size-4" />}
                        {installActionLabel}
                      </Button>
                    ) : usageDashboardUrl ? (
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-center"
                          onClick={() => {
                            void noraSystemClient.openExternalUrl(usageDashboardUrl);
                          }}
                        >
                          Open usage dashboard
                        </Button>
                        <div className="truncate text-xs text-muted-foreground" title={usageDashboardUrl}>
                          {usageDashboardUrl}
                        </div>
                        {tool.supportsAccountSwitch ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-center"
                            onClick={() => {
                              void switchToolAccount(tool.id, { refreshUsage: false });
                            }}
                            disabled={isActionLoading || !onSwitchToolAccount}
                          >
                            {isActionLoading ? <LoaderCircle className="size-4 animate-spin" /> : <UserRound className="size-4" />}
                            {accountActionLabel}
                          </Button>
                        ) : null}
                      </div>
                    ) : tool.supportsUsageStatus ? (
                      <>
                        <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
                          <div className="text-[11px] text-muted-foreground">Hourly</div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary/80"
                                  style={{ width: `${summary.hourly.percentLeft ?? 0}%` }}
                                />
                              </div>
                              <div className="w-16 shrink-0 text-right text-xs tabular-nums text-foreground">
                                {summary.hourly.percentLeft !== null ? `${summary.hourly.percentLeft}% left` : "--"}
                              </div>
                            </div>
                            <div className="truncate text-xs text-muted-foreground" title={summary.hourly.resetAt ?? "Reset time not reported"}>
                              {summary.hourly.resetAt ? `Resets ${summary.hourly.resetAt}` : "Reset time not reported"}
                            </div>
                          </div>
                          <div className="text-[11px] text-muted-foreground">Weekly</div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary/80"
                                  style={{ width: `${summary.weekly.percentLeft ?? 0}%` }}
                                />
                              </div>
                              <div className="w-16 shrink-0 text-right text-xs tabular-nums text-foreground">
                                {summary.weekly.percentLeft !== null ? `${summary.weekly.percentLeft}% left` : "--"}
                              </div>
                            </div>
                            <div className="truncate text-xs text-muted-foreground" title={summary.weekly.resetAt ?? "Reset time not reported"}>
                              {summary.weekly.resetAt ? `Resets ${summary.weekly.resetAt}` : "Reset time not reported"}
                            </div>
                          </div>
                          <div className="text-[11px] text-muted-foreground">User</div>
                          <div className="min-w-0 truncate text-foreground" title={summary.account}>{summary.account}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {tool.supportsAccountSwitch ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="flex-1 justify-center"
                              onClick={() => {
                                void switchToolAccount(tool.id, { refreshUsage: true });
                              }}
                              disabled={isActionLoading || !onSwitchToolAccount}
                            >
                              {isActionLoading ? <LoaderCircle className="size-4 animate-spin" /> : <UserRound className="size-4" />}
                              {accountActionLabel}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              void loadToolUsage(tool.id);
                            }}
                            disabled={isUsageLoading}
                            aria-label={`Refresh ${tool.label} usage`}
                          >
                            <RefreshCcw className="size-4" />
                          </Button>
                        </div>
                      </>
                    ) : tool.supportsAccountSwitch ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-center"
                        onClick={() => {
                          void switchToolAccount(tool.id, { refreshUsage: false });
                        }}
                        disabled={isActionLoading || !onSwitchToolAccount}
                      >
                        {isActionLoading ? <LoaderCircle className="size-4 animate-spin" /> : <UserRound className="size-4" />}
                        {accountActionLabel}
                      </Button>
                    ) : null}
                  {toolErrorById[tool.id] ? (
                    <div className="rounded-[6px] border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                      {toolErrorById[tool.id]}
                    </div>
                  ) : null}
                </PopoverContent>
              </Popover>
            );
          })}
          <Popover
            open={skillsPopoverOpen}
            onOpenChange={(open) => {
              setOpenToolId(null);
              setSkillsPopoverOpen(open);
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Skills"
                className="flex items-center gap-1 rounded-[4px] bg-transparent px-1 py-0.5 transition hover:bg-accent/50"
                aria-label="Open skills list"
              >
                <Sparkles className="size-4 text-muted-foreground" />
                <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{availableSkillCount}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-[380px] space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Skills</div>
                  <div className="text-xs text-muted-foreground">{availableSkillCount} installed</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenSkillsSettings?.();
                    setSkillsPopoverOpen(false);
                  }}
                >
                  Open skills settings
                </Button>
              </div>
              {skillCatalogSummaries.length ? (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {skillCatalogSummaries.map((summary) => (
                    <div key={summary.toolId} className="rounded-[6px] border border-border/60 bg-background/50 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-medium text-foreground">{summary.label}</div>
                        <div className="shrink-0 text-xs text-muted-foreground">{summary.catalog.skills.length}</div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {summary.catalog.skills.length ? (
                          summary.catalog.skills.map((skill) => (
                            <span
                              key={skill.id}
                              className={cn(
                                "max-w-full truncate rounded-[4px] border border-border/60",
                                "bg-background/70 px-2 py-0.5 text-xs text-foreground"
                              )}
                            >
                              {skill.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No visible skills installed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[6px] border border-border/60 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                  No supported skill catalogs are available for the detected agent setup.
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {activeWorkspaceBranch || activeWorkspaceWorktreeName ? (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <GitBranch className="size-3.5" />
            <span className="truncate" title={[activeWorkspaceBranch, activeWorkspaceWorktreeName].filter(Boolean).join(" · ")}>
              {[activeWorkspaceBranch, activeWorkspaceWorktreeName].filter(Boolean).join(" · ")}
            </span>
          </div>
        ) : null}
        <div>{activeEntry ? "Working" : "Idle"}</div>
      </div>
    </div>
  );
}
