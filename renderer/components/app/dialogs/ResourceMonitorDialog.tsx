import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { ResourceMonitorDialogProps } from "@/components/app/types/chromeDialog.types";
import {
  Dialog,
  DialogBody,
  DialogContent
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ResourceMonitorEntry, ResourceMonitorSnapshot } from "@shared/types/resourceMonitor.types";
import { Activity, AlertTriangle, Cpu, HardDrive, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const RESOURCE_MONITOR_POLL_MS = 2500;
const RESOURCE_MONITOR_HISTORY_LIMIT = 48;

type ResourceMonitorLoadState = "idle" | "loading" | "refreshing" | "error";
type ResourceTrendRow = {
  index: number;
  label: string;
  cpuPercent: number;
  memoryMegabytes: number;
};

type TrendTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
};

function formatMemory(bytes: number | null): string {
  if (bytes === null) {
    return "-";
  }

  const gibibytes = bytes / 1024 / 1024 / 1024;
  if (gibibytes >= 1) {
    return `${gibibytes.toFixed(2)} GB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

function formatCpu(percent: number | null): string {
  return percent === null ? "-" : `${percent.toFixed(percent >= 10 ? 0 : 1)}%`;
}

function formatMegabytes(megabytes: number): string {
  return formatMemory(megabytes * 1024 * 1024);
}

function getKindLabel(kind: ResourceMonitorEntry["kind"]): string {
  switch (kind) {
    case "app":
      return "App";
    case "agent":
      return "Agent";
    case "terminal":
      return "Terminal";
    case "local-terminal":
      return "Local terminal";
  }
}

function getEntrySortValue(entry: ResourceMonitorEntry): number {
  if (entry.kind === "app") {
    return Number.POSITIVE_INFINITY;
  }
  return entry.usage.cpuPercent ?? entry.usage.memoryBytes ?? 0;
}

function buildTrendRow(snapshot: ResourceMonitorSnapshot, index: number): ResourceTrendRow {
  return {
    index,
    label: new Date(snapshot.sampledAt).toLocaleTimeString([], {
      minute: "2-digit",
      second: "2-digit"
    }),
    cpuPercent: snapshot.total.cpuPercent ?? 0,
    memoryMegabytes: snapshot.total.memoryBytes === null ? 0 : snapshot.total.memoryBytes / 1024 / 1024
  };
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0]?.payload as ResourceTrendRow | undefined;
  if (!row) {
    return null;
  }

  return (
    <div className="rounded-[5px] border border-border/80 bg-popover/95 px-3 py-2 text-xs shadow-panel backdrop-blur-sm">
      <div className="font-semibold text-foreground">{row.label}</div>
      <div className="mt-1 text-muted-foreground">CPU {formatCpu(row.cpuPercent)}</div>
      <div className="text-muted-foreground">Memory {formatMegabytes(row.memoryMegabytes)}</div>
    </div>
  );
}

function ResourceTrendCard({
  title,
  value,
  detail,
  icon,
  children
}: {
  title: string;
  value: string;
  detail: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[210px] overflow-hidden rounded-[7px] border border-border/70 bg-card/70">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {icon}
            {title}
          </div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
        </div>
      </div>
      <div className="mt-3 h-[118px] px-2 pb-3">{children}</div>
    </div>
  );
}

export function ResourceMonitorDialog({
  open,
  onOpenChange
}: ResourceMonitorDialogProps) {
  const [snapshot, setSnapshot] = useState<ResourceMonitorSnapshot | null>(null);
  const [history, setHistory] = useState<ResourceMonitorSnapshot[]>([]);
  const [loadState, setLoadState] = useState<ResourceMonitorLoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async (mode: "loading" | "refreshing") => {
    setLoadState(mode);
    setErrorMessage(null);
    try {
      const next = await noraSystemClient.getResourceMonitorSnapshot();
      setSnapshot(next);
      setHistory((current) => [...current, next].slice(-RESOURCE_MONITOR_HISTORY_LIMIT));
      setLoadState("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load resource usage.");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setHistory([]);
      return;
    }

    void refresh("loading");
    const interval = window.setInterval(() => {
      void refresh("refreshing");
    }, RESOURCE_MONITOR_POLL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [open, refresh]);

  const entries = useMemo(
    () => [...(snapshot?.entries ?? [])].sort((left, right) => getEntrySortValue(right) - getEntrySortValue(left)),
    [snapshot]
  );
  const trendRows = useMemo(() => history.map(buildTrendRow), [history]);
  const processCount = entries.reduce((total, entry) => total + entry.processCount, 0);
  const runningEntryCount = entries.filter((entry) => entry.unavailableReason === null).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-auto w-[min(1120px,calc(100vw-2rem))] max-w-none"
        onClose={() => onOpenChange(false)}
        headerTitle={
          <span className="flex min-w-0 items-center gap-2">
            <Activity className="size-5 shrink-0 text-primary" />
            <span className="truncate">Resource monitor</span>
          </span>
        }
      >
        <DialogBody className="flex-none overflow-visible px-5 pt-0">
          {errorMessage ? (
            <div className="mb-4 flex items-start gap-3 rounded-[6px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <Tabs defaultValue="overview" className="flex min-h-0 flex-col gap-4">
            <TabsList className="w-fit">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="attribution">Attribution</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="min-h-0">
              {snapshot ? (
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
                  <ResourceTrendCard
                    title="CPU"
                    value={formatCpu(snapshot.total.cpuPercent)}
                    detail="Whole-machine share for Nora and child processes"
                    icon={<Cpu className="size-3.5" />}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendRows} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.45} vertical={false} />
                        <XAxis dataKey="index" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip content={<TrendTooltip />} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.25 }} />
                        <Line
                          type="monotone"
                          dataKey="cpuPercent"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ResourceTrendCard>

                  <ResourceTrendCard
                    title="Memory"
                    value={formatMemory(snapshot.total.memoryBytes)}
                    detail="Resident memory across the same process tree"
                    icon={<HardDrive className="size-3.5" />}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendRows} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.45} vertical={false} />
                        <XAxis dataKey="index" hide />
                        <YAxis hide domain={["dataMin", "dataMax"]} />
                        <Tooltip content={<TrendTooltip />} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.25 }} />
                        <Area
                          type="monotone"
                          dataKey="memoryMegabytes"
                          stroke="hsl(200 70% 48%)"
                          fill="hsl(200 70% 48% / 0.18)"
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ResourceTrendCard>

                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="rounded-[7px] border border-border/70 bg-background/60 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sessions</div>
                      <div className="mt-2 text-2xl font-semibold text-foreground">{runningEntryCount}</div>
                      <div className="mt-1 text-xs text-muted-foreground">active rows</div>
                    </div>
                    <div className="rounded-[7px] border border-border/70 bg-background/60 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Processes</div>
                      <div className="mt-2 text-2xl font-semibold text-foreground">{processCount}</div>
                      <div className="mt-1 text-xs text-muted-foreground">in tracked trees</div>
                    </div>
                    <div className="rounded-[7px] border border-border/70 bg-background/60 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">App PID</div>
                      <div className="mt-2 text-2xl font-semibold text-foreground">{snapshot.appPid}</div>
                      <div className="mt-1 text-xs text-muted-foreground">root process</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Loading resource usage
                </div>
              )}
            </TabsContent>

            <TabsContent value="attribution" className="min-h-0">
              <div className="flex min-h-0 flex-col overflow-hidden rounded-[7px] border border-border/70 bg-background/40">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-card/70 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Activity className="size-4 text-primary" />
                    Resource attribution
                  </div>
                  <div className="text-xs text-muted-foreground">{entries.length} tracked sessions</div>
                </div>
                <div className="grid grid-cols-[minmax(150px,1.2fr)_130px_110px_120px_120px_minmax(160px,1fr)] gap-4 border-b border-border/70 bg-muted/35 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <div>Name</div>
                  <div>Kind</div>
                  <div>PID</div>
                  <div>CPU</div>
                  <div>Memory</div>
                  <div>Process tree</div>
                </div>
                <div className="max-h-[min(46vh,420px)] min-h-[220px] overflow-auto">
                  {entries.length === 0 && loadState === "loading" ? (
                    <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" />
                      Loading resource usage
                    </div>
                  ) : entries.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                      No running app processes were found.
                    </div>
                  ) : entries.map((entry) => (
                    <div
                      key={`${entry.kind}:${entry.id}`}
                      className="grid grid-cols-[minmax(150px,1.2fr)_130px_110px_120px_120px_minmax(160px,1fr)] items-center gap-4 border-b border-border/60 px-4 py-3 text-sm last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{entry.label}</div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">{entry.command || entry.workspace || entry.status}</div>
                      </div>
                      <div className="text-muted-foreground">{getKindLabel(entry.kind)}</div>
                      <div className="font-mono text-xs text-muted-foreground">{entry.pid ?? "-"}</div>
                      <div className="font-medium text-foreground">{formatCpu(entry.usage.cpuPercent)}</div>
                      <div className="font-medium text-foreground">{formatMemory(entry.usage.memoryBytes)}</div>
                      <div className="min-w-0 text-xs text-muted-foreground">
                        {entry.unavailableReason ? (
                          <span>{entry.unavailableReason}</span>
                        ) : (
                          <span>
                            {entry.processCount} process{entry.processCount === 1 ? "" : "es"}
                            {entry.childPids.length ? `, ${entry.childPids.length} child PID${entry.childPids.length === 1 ? "" : "s"}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
