import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import {
  AgentUsageDailyTrendChart,
  AgentUsageTotalsRing,
  AgentUsageWorktreeBarList
} from "@/components/app/panels/settings/agentUsageCharts";
import { SettingsSectionHeader } from "@/components/app/panels/settings/settingsUi";
import { Button } from "@/components/ui/button";
import type {
  AgentUsageDailyRow,
  AgentUsageWorktreeInput,
  ClaudeLocalUsageStats,
  CodexLocalUsageStats,
  LocalAgentUsageReport
} from "@shared/appTypes";
import { BarChart3, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const formatTokens = (n: number): string => n.toLocaleString();

const worktreeBasename = (pathValue: string): string => {
  const trimmed = pathValue.replace(/[/\\]+$/, "");
  const parts = trimmed.split(/[/\\]/);
  return parts[parts.length - 1] || pathValue;
};

const buildWorktreeInputs = (snapshot: ReturnType<typeof useCanonicalAppSnapshot>): AgentUsageWorktreeInput[] => {
  if (!snapshot) {
    return [];
  }
  return snapshot.worktrees.map((worktree) => ({
    worktreeId: worktree.id,
    path: worktree.path,
    displayName: worktree.branch ? `${worktreeBasename(worktree.path)} · ${worktree.branch}` : worktreeBasename(worktree.path)
  }));
};

const StatBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-[4.5rem] flex-col gap-0.5 border-l border-border/50 pl-3 first:border-l-0 first:pl-0">
    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="tabular-nums text-sm font-semibold leading-none text-foreground">{value}</span>
  </div>
);

const DailyUsageTable = ({ rows, showReasoning }: { rows: AgentUsageDailyRow[]; showReasoning: boolean }) => {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No usage with token data found in local logs yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border/60">
      <table className="w-full min-w-[420px] text-left text-xs">
        <thead className="border-b border-border/60 bg-muted/40">
          <tr>
            <th className="px-2 py-2 font-medium text-muted-foreground">Day</th>
            <th className="px-2 py-2 font-medium text-muted-foreground">In</th>
            <th className="px-2 py-2 font-medium text-muted-foreground">Out</th>
            <th className="px-2 py-2 font-medium text-muted-foreground">Cache read</th>
            {showReasoning ? (
              <th className="px-2 py-2 font-medium text-muted-foreground">Reasoning</th>
            ) : (
              <th className="px-2 py-2 font-medium text-muted-foreground">Cache write</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.day} className="border-b border-border/40 last:border-0">
              <td className="px-2 py-1.5 tabular-nums text-foreground">{row.day}</td>
              <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{formatTokens(row.inputTokens)}</td>
              <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{formatTokens(row.outputTokens)}</td>
              <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{formatTokens(row.cacheReadTokens)}</td>
              <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                {showReasoning ? formatTokens(row.reasoningOutputTokens) : formatTokens(row.cacheWriteTokens)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ProviderCard = ({
  title,
  description,
  filesLabel,
  fileCount,
  stats,
  codex
}: {
  title: string;
  description: string;
  filesLabel: string;
  fileCount: number;
  stats: ClaudeLocalUsageStats | CodexLocalUsageStats;
  codex: boolean;
}) => {
  const totals = stats.totals;
  const showReasoning = codex;
  const fourthTokens = codex && "reasoningOutputTokens" in totals ? totals.reasoningOutputTokens : totals.cacheWriteTokens;
  const variant = codex ? "codex" : "claude";

  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-card/30 p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-[11px] tabular-nums text-muted-foreground">
          {filesLabel}: {fileCount}
        </div>
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{description}</p>

      <div className="mt-3 flex min-h-0 min-w-0 flex-row flex-wrap items-start gap-3 lg:flex-nowrap lg:items-stretch">
        <div className="flex shrink-0 flex-row flex-wrap items-end gap-x-0 gap-y-2">
          <StatBlock label="Input" value={formatTokens(totals.inputTokens)} />
          <StatBlock label="Output" value={formatTokens(totals.outputTokens)} />
          <StatBlock label="Cache read" value={formatTokens(totals.cacheReadTokens)} />
          {codex && "reasoningOutputTokens" in totals ? (
            <StatBlock label="Reasoning" value={formatTokens(totals.reasoningOutputTokens)} />
          ) : (
            <StatBlock label="Cache write" value={formatTokens(totals.cacheWriteTokens)} />
          )}
          {codex && "totalTokens" in totals ? (
            <StatBlock label="Total (log)" value={formatTokens(totals.totalTokens)} />
          ) : null}
        </div>

        <div className="flex shrink-0 self-center">
          <AgentUsageTotalsRing
            compact
            inputTokens={totals.inputTokens}
            outputTokens={totals.outputTokens}
            cacheReadTokens={totals.cacheReadTokens}
            fourthTokens={fourthTokens}
            variant={variant}
          />
        </div>

        <div className="min-h-[168px] min-w-[min(100%,12rem)] flex-1 basis-full rounded-lg border border-border/40 bg-background/40 p-2 sm:min-w-[14rem] lg:min-h-[180px] lg:basis-0">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Daily trend</div>
          <AgentUsageDailyTrendChart rows={stats.recentDays} variant={variant} />
        </div>
      </div>

      <details className="mt-3 group">
        <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground marker:content-none hover:text-foreground [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-1 transition group-open:border-primary/30 group-open:bg-primary/5">
            Numeric table
            <span className="text-[10px] text-muted-foreground/80">(expand)</span>
          </span>
        </summary>
        <div className="mt-3">
          <DailyUsageTable rows={stats.recentDays} showReasoning={showReasoning} />
        </div>
      </details>

      <AgentUsageWorktreeBarList rows={stats.topWorktrees} showReasoning={showReasoning} variant={variant} />
    </div>
  );
};

export function AgentUsageStatsSection() {
  const snapshot = useCanonicalAppSnapshot();
  const worktrees = useMemo(() => buildWorktreeInputs(snapshot), [snapshot]);

  const [report, setReport] = useState<LocalAgentUsageReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const next = await noraSystemClient.scanLocalAgentUsage({ worktrees });
      setReport(next);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load usage";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [worktrees]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="max-w-6xl">
      <SettingsSectionHeader
        title="Agent usage"
        description="Estimated token usage from Claude Code and Codex session files on this machine (~/.claude/projects and ~/.codex/sessions). Attribution to Nora worktrees uses each tool’s recorded working directory."
        icon={BarChart3}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void load()}
          className="gap-2"
          aria-busy={loading}
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </Button>
        {report ? (
          <span className="text-xs text-muted-foreground">Last scanned {new Date(report.scannedAt).toLocaleString()}</span>
        ) : null}
      </div>

      {error ? <div className="mt-3 text-sm text-destructive">{error}</div> : null}

      <div className="mt-6 flex min-w-0 flex-col gap-4">
        <ProviderCard
          title="Claude Code"
          description="Parsed from assistant turns in local JSONL transcripts that include usage metadata."
          filesLabel="Transcript files scanned"
          fileCount={report?.claude.transcriptFilesScanned ?? 0}
          stats={
            report?.claude ?? {
              transcriptFilesScanned: 0,
              totals: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
              recentDays: [],
              topWorktrees: []
            }
          }
          codex={false}
        />
        <ProviderCard
          title="Codex"
          description="Parsed from token_count events in local Codex rollout JSONL logs."
          filesLabel="Session files scanned"
          fileCount={report?.codex.sessionFilesScanned ?? 0}
          stats={
            report?.codex ?? {
              sessionFilesScanned: 0,
              totals: {
                inputTokens: 0,
                outputTokens: 0,
                cacheReadTokens: 0,
                cacheWriteTokens: 0,
                reasoningOutputTokens: 0,
                totalTokens: 0
              },
              recentDays: [],
              topWorktrees: []
            }
          }
          codex={true}
        />
      </div>
    </div>
  );
}
