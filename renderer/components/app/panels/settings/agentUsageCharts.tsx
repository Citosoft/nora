/**
 * Agent usage charts (Recharts): stacked daily trend, donut totals, worktree bars.
 */
import type { AgentUsageDailyRow, AgentUsageWorktreeRow } from "@shared/appTypes";
import { useCallback, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const formatTokens = (n: number): string => n.toLocaleString();

type ChartPalette = {
  input: string;
  output: string;
  cacheRead: string;
  fourth: string;
};

const paletteClaude: ChartPalette = {
  input: "hsl(var(--primary))",
  output: "hsl(160 55% 42%)",
  cacheRead: "hsl(262 52% 52%)",
  fourth: "hsl(32 92% 48%)"
};

const paletteCodex: ChartPalette = {
  input: "hsl(var(--primary))",
  output: "hsl(200 70% 48%)",
  cacheRead: "hsl(262 52% 52%)",
  fourth: "hsl(280 45% 55%)"
};

const dayShortLabel = (day: string): string => {
  const parts = day.split("-");
  if (parts.length === 3) {
    return `${parts[1]}-${parts[2]}`;
  }
  return day;
};

type DailyChartRow = {
  label: string;
  fullDay: string;
  input: number;
  output: number;
  cacheRead: number;
  fourth: number;
};

type SeriesKey = "input" | "output" | "cacheRead" | "fourth";

type TooltipLike = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
};

const DailyTooltip = ({ active, payload, variant }: TooltipLike & { variant: "claude" | "codex" }) => {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload as DailyChartRow | undefined;
  if (!row) {
    return null;
  }
  const fourthLabel = variant === "codex" ? "Reasoning" : "Cache write";
  const cacheLabel = variant === "codex" ? "Cached in" : "Cache read";

  return (
    <div className="rounded-md border border-border/80 bg-popover/95 px-2.5 py-2 text-[11px] shadow-md backdrop-blur-sm">
      <div className="font-semibold text-foreground">{row.fullDay}</div>
      <dl className="mt-1 space-y-0.5 text-muted-foreground">
        <div className="flex justify-between gap-4">
          <dt className="text-foreground/80">Input</dt>
          <dd className="tabular-nums">{formatTokens(row.input)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-foreground/80">Output</dt>
          <dd className="tabular-nums">{formatTokens(row.output)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-foreground/80">{cacheLabel}</dt>
          <dd className="tabular-nums">{formatTokens(row.cacheRead)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-foreground/80">{fourthLabel}</dt>
          <dd className="tabular-nums">{formatTokens(row.fourth)}</dd>
        </div>
      </dl>
    </div>
  );
};

export const AgentUsageDailyTrendChart = ({
  rows,
  variant
}: {
  rows: AgentUsageDailyRow[];
  variant: "claude" | "codex";
}) => {
  const palette = variant === "codex" ? paletteCodex : paletteClaude;
  const [hidden, setHidden] = useState<Partial<Record<SeriesKey, boolean>>>({});

  const data = useMemo<DailyChartRow[]>(() => {
    return rows.map((row) => ({
      label: dayShortLabel(row.day),
      fullDay: row.day,
      input: row.inputTokens,
      output: row.outputTokens,
      cacheRead: row.cacheReadTokens,
      fourth: variant === "codex" ? row.reasoningOutputTokens : row.cacheWriteTokens
    }));
  }, [rows, variant]);

  const fourthName = variant === "codex" ? "Reasoning" : "Cache write";
  const cacheName = variant === "codex" ? "Cached in" : "Cache read";

  const handleLegendClick = useCallback((dataKey: string | undefined) => {
    if (dataKey !== "input" && dataKey !== "output" && dataKey !== "cacheRead" && dataKey !== "fourth") {
      return;
    }
    const key = dataKey as SeriesKey;
    setHidden((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (data.length === 0) {
    return (
      <div
        className="flex h-[168px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-xs text-muted-foreground"
        role="img"
        aria-label="No daily usage chart data"
      >
        No daily data to chart yet
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 4 }} barCategoryGap="18%">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.55} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatTokens(v)}
            width={44}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.12)" }}
            content={({ active: a, payload: pl }) => <DailyTooltip active={a} payload={pl} variant={variant} />}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 4, cursor: "pointer" }}
            formatter={(value, entry) => (
              <span style={{ opacity: entry?.dataKey && hidden[entry.dataKey as SeriesKey] ? 0.45 : 1 }}>{value}</span>
            )}
            onClick={(payload) => {
              const key = payload?.dataKey;
              handleLegendClick(typeof key === "string" ? key : key != null ? String(key) : undefined);
            }}
            iconType="square"
          />
          <Bar dataKey="input" name="Input" stackId="tok" fill={palette.input} hide={Boolean(hidden.input)} radius={[2, 2, 0, 0]} />
          <Bar dataKey="output" name="Output" stackId="tok" fill={palette.output} hide={Boolean(hidden.output)} />
          <Bar dataKey="cacheRead" name={cacheName} stackId="tok" fill={palette.cacheRead} hide={Boolean(hidden.cacheRead)} />
          <Bar dataKey="fourth" name={fourthName} stackId="tok" fill={palette.fourth} hide={Boolean(hidden.fourth)} radius={[0, 0, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">Legend: click a series to show or hide it.</p>
    </div>
  );
};

type PieDatum = { name: string; value: number; color: string };

const PieTooltip = ({ active, payload }: TooltipLike) => {
  if (!active || !payload?.length) {
    return null;
  }
  const item = payload[0] as { name?: unknown; value?: unknown };
  const name = typeof item.name === "string" ? item.name : "—";
  const value = typeof item.value === "number" ? item.value : 0;
  return (
    <div className="rounded-md border border-border/80 bg-popover/95 px-2 py-1.5 text-[11px] shadow-md">
      <span className="font-medium text-foreground">{name}</span>
      <span className="ml-2 tabular-nums text-muted-foreground">{formatTokens(value)}</span>
    </div>
  );
};

export const AgentUsageTotalsRing = ({
  inputTokens,
  outputTokens,
  cacheReadTokens,
  fourthTokens,
  variant,
  compact = false
}: {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  fourthTokens: number;
  variant: "claude" | "codex";
  compact?: boolean;
}) => {
  const total = inputTokens + outputTokens + cacheReadTokens + fourthTokens;

  const pieData = useMemo<PieDatum[]>(() => {
    if (total <= 0) {
      return [];
    }
    const pal = variant === "codex" ? paletteCodex : paletteClaude;
    const parts: PieDatum[] = [
      { name: "Input", value: inputTokens, color: pal.input },
      { name: "Output", value: outputTokens, color: pal.output },
      {
        name: variant === "codex" ? "Cached in" : "Cache read",
        value: cacheReadTokens,
        color: pal.cacheRead
      },
      {
        name: variant === "codex" ? "Reasoning" : "Cache write",
        value: fourthTokens,
        color: pal.fourth
      }
    ];
    return parts.filter((p) => p.value > 0);
  }, [inputTokens, outputTokens, cacheReadTokens, fourthTokens, total, variant]);

  const [hiddenPie, setHiddenPie] = useState<Partial<Record<string, boolean>>>({});

  const visiblePieData = useMemo(
    () => pieData.filter((d) => !hiddenPie[d.name]),
    [pieData, hiddenPie]
  );

  const pieTotal = useMemo(() => visiblePieData.reduce((s, d) => s + d.value, 0), [visiblePieData]);

  const inner = compact ? "52%" : "55%";
  const outer = compact ? "78%" : "80%";

  if (pieData.length === 0) {
    return (
      <div
        className={`mx-auto flex ${compact ? "size-24" : "size-28"} items-center justify-center rounded-full border border-dashed border-border/60 bg-muted/15 text-[10px] text-muted-foreground`}
        role="img"
        aria-label="No totals breakdown"
      >
        —
      </div>
    );
  }

  if (visiblePieData.length === 0) {
    return (
      <div className={compact ? "flex w-[min(100%,11rem)] flex-col items-stretch gap-2" : "flex flex-col items-center gap-2 sm:flex-row sm:gap-4"}>
        <div
          className={`mx-auto flex ${compact ? "h-20 w-20" : "h-28 w-28"} items-center justify-center rounded-full border border-dashed border-border/60 bg-muted/15 text-center text-[10px] text-muted-foreground`}
          role="status"
        >
          All segments hidden — use the list below to show again.
        </div>
        <ul className={compact ? "text-[10px]" : "text-[11px]"}>
          {pieData.map((s) => (
            <li key={s.name}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-left hover:bg-muted/50"
                onClick={() => setHiddenPie((p) => ({ ...p, [s.name]: false }))}
              >
                <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="truncate">{s.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-foreground">{formatTokens(s.value)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={compact ? "flex w-[min(100%,11rem)] flex-col items-stretch gap-1" : "flex w-full flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4"}>
      <div className={compact ? "h-[100px] w-full min-w-0" : "h-[200px] w-full min-w-0 max-w-[240px] sm:h-[220px]"}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visiblePieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={inner}
              outerRadius={outer}
              paddingAngle={2}
              stroke="hsl(var(--background))"
              strokeWidth={1}
            >
              {visiblePieData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center">
        <div className={`font-semibold uppercase tracking-wide text-muted-foreground ${compact ? "text-[8px]" : "text-[9px]"}`}>
          Total
        </div>
        <div className={`font-semibold tabular-nums text-foreground ${compact ? "text-xs" : "text-sm"}`}>
          {formatTokens(pieTotal)}
        </div>
      </div>
      <ul
        className={
          compact
            ? "max-h-[5.5rem] min-w-0 space-y-1 overflow-y-auto pr-0.5 text-[10px]"
            : "min-w-0 max-w-[200px] space-y-1.5 text-[11px] sm:max-w-none"
        }
      >
        {pieData.map((s) => (
          <li key={s.name}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-left transition hover:bg-muted/50"
              style={{ opacity: hiddenPie[s.name] ? 0.45 : 1 }}
              onClick={() => setHiddenPie((p) => ({ ...p, [s.name]: !p[s.name] }))}
              aria-pressed={Boolean(hiddenPie[s.name])}
            >
              <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="truncate">{s.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-foreground">{formatTokens(s.value)}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-center text-[9px] text-muted-foreground">Click a slice label to toggle.</p>
    </div>
  );
};

type WorktreeChartRow = {
  name: string;
  fullName: string;
  input: number;
  output: number;
  cacheRead: number;
  fourth: number;
};

const WorktreeTooltip = ({ active, payload, variant }: TooltipLike & { variant: "claude" | "codex" }) => {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload as WorktreeChartRow | undefined;
  if (!row) {
    return null;
  }
  const fourthLabel = variant === "codex" ? "Reasoning" : "Cache write";
  const cacheLabel = variant === "codex" ? "Cached in" : "Cache read";
  return (
    <div className="max-w-xs rounded-md border border-border/80 bg-popover/95 px-2.5 py-2 text-[11px] shadow-md">
      <div className="font-medium text-foreground">{row.fullName}</div>
      <dl className="mt-1 space-y-0.5 text-muted-foreground">
        <div className="flex justify-between gap-4">
          <dt>Input</dt>
          <dd className="tabular-nums">{formatTokens(row.input)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Output</dt>
          <dd className="tabular-nums">{formatTokens(row.output)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>{cacheLabel}</dt>
          <dd className="tabular-nums">{formatTokens(row.cacheRead)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>{fourthLabel}</dt>
          <dd className="tabular-nums">{formatTokens(row.fourth)}</dd>
        </div>
      </dl>
    </div>
  );
};

export const AgentUsageWorktreeBarList = ({
  rows,
  showReasoning,
  variant
}: {
  rows: AgentUsageWorktreeRow[];
  showReasoning: boolean;
  variant: "claude" | "codex";
}) => {
  const palette = variant === "codex" ? paletteCodex : paletteClaude;
  const fourthName = variant === "codex" ? "Reasoning" : "Cache write";
  const cacheName = variant === "codex" ? "Cached in" : "Cache read";

  const data = useMemo<WorktreeChartRow[]>(() => {
    return rows.map((row) => {
      const label =
        row.projectLabel.length > 30 ? `${row.projectLabel.slice(0, 28)}…` : row.projectLabel;
      return {
        name: label,
        fullName: row.projectLabel,
        input: row.inputTokens,
        output: row.outputTokens,
        cacheRead: row.cacheReadTokens,
        fourth: showReasoning ? row.reasoningOutputTokens : row.cacheWriteTokens
      };
    });
  }, [rows, showReasoning]);

  const chartHeight = Math.min(400, Math.max(140, data.length * 32));

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 w-full min-w-0">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">By worktree / folder</div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart layout="horizontal" data={data} margin={{ top: 4, right: 12, left: 4, bottom: 4 }} barCategoryGap={10}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.45} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatTokens(v)} />
          <YAxis
            type="category"
            dataKey="name"
            width={148}
            tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
          />
          <Tooltip
            content={({ active: a, payload: pl }) => <WorktreeTooltip active={a} payload={pl} variant={variant} />}
            cursor={{ fill: "hsl(var(--muted) / 0.1)" }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} iconType="square" />
          <Bar dataKey="input" name="Input" stackId="w" fill={palette.input} radius={[0, 2, 2, 0]} />
          <Bar dataKey="output" name="Output" stackId="w" fill={palette.output} />
          <Bar dataKey="cacheRead" name={cacheName} stackId="w" fill={palette.cacheRead} />
          <Bar dataKey="fourth" name={fourthName} stackId="w" fill={palette.fourth} radius={[2, 0, 0, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
