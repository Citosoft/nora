import type { ResolvedTheme } from "@/components/app/types";

export function formatAgentMode(mode: "read" | "write"): string {
  return mode === "read" ? "Read-only" : "Writable";
}

export function diffLineClass(line: string, resolvedTheme: ResolvedTheme): string {
  const isDark = resolvedTheme === "dark";

  if (line.startsWith("+") && !line.startsWith("+++")) {
    return isDark ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-500/10 text-emerald-900";
  }
  if (line.startsWith("-") && !line.startsWith("---")) {
    return isDark ? "bg-rose-500/10 text-rose-200" : "bg-rose-500/10 text-rose-900";
  }
  if (line.startsWith("@@")) {
    return isDark ? "bg-sky-500/10 text-sky-200" : "bg-sky-500/10 text-sky-900";
  }
  return isDark ? "text-slate-200" : "text-slate-800";
}

export function formatTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return "Unknown";
  }

  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

export function statusVariant(status: string): "success" | "warning" | "destructive" | "secondary" | "default" {
  if (status === "running" || status === "available" || status === "installed") {
    return "success";
  }
  if (status === "idle" || status === "stopped") {
    return "warning";
  }
  if (status === "error" || status === "missing") {
    return "destructive";
  }
  return "secondary";
}
