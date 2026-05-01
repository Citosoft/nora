import type { ForgeWorkflowRunDetail } from "@shared/appTypes";

const parseWorkflowInstantMs = (iso: string | null): number | null => {
  if (!iso) {
    return null;
  }
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? null : parsed;
};

export const formatForgeWorkflowDurationMs = (ms: number): string => {
  if (ms < 0) {
    return "0s";
  }
  if (ms < 1000) {
    return "<1s";
  }
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}s`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) {
    return sec ? `${min}m ${sec}s` : `${min}m`;
  }
  const h = Math.floor(min / 60);
  const rMin = min % 60;
  return rMin ? `${h}h ${rMin}m` : `${h}h`;
};

export const isForgeWorkflowStatusInFlight = (status: string): boolean => {
  const normalized = status.toLowerCase();
  return normalized === "in_progress" || normalized === "queued" || normalized === "pending" || normalized === "waiting";
};

/** Wall-clock instant for a GitHub Actions timestamp (job or step). */
export const formatForgeWorkflowInstantLabel = (iso: string | null): string | null => {
  const ms = parseWorkflowInstantMs(iso);
  if (ms === null) {
    return null;
  }
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });
};

export type ForgeWorkflowTimingParts = {
  /** e.g. "May 1, 3:42:01 PM" */
  startedLabel: string | null;
  /** e.g. "45s" or "2m 5s"; null if not started or unknown */
  durationLabel: string | null;
  /** True when the item has started but not finished */
  isRunning: boolean;
};

export const getForgeWorkflowTimingParts = (
  startedAt: string | null,
  completedAt: string | null,
  status: string,
  nowMs: number
): ForgeWorkflowTimingParts => {
  const startMs = parseWorkflowInstantMs(startedAt);
  const completedMs = parseWorkflowInstantMs(completedAt);
  const startedLabel = formatForgeWorkflowInstantLabel(startedAt);
  if (startMs === null) {
    return { startedLabel: null, durationLabel: null, isRunning: false };
  }
  if (completedMs !== null && completedMs >= startMs) {
    return {
      startedLabel,
      durationLabel: formatForgeWorkflowDurationMs(completedMs - startMs),
      isRunning: false
    };
  }
  if (isForgeWorkflowStatusInFlight(status)) {
    return {
      startedLabel,
      durationLabel: formatForgeWorkflowDurationMs(Math.max(0, nowMs - startMs)),
      isRunning: true
    };
  }
  return { startedLabel, durationLabel: null, isRunning: false };
};

export const forgeWorkflowRunHasInFlightItems = (detail: ForgeWorkflowRunDetail): boolean =>
  detail.jobs.some(
    (job) =>
      isForgeWorkflowStatusInFlight(job.status) ||
      job.steps.some((step) => isForgeWorkflowStatusInFlight(step.status))
  );

/** Single muted line: start wall time, duration, and optional "so far" while running. */
export const formatForgeWorkflowTimingLine = (parts: ForgeWorkflowTimingParts): string | null => {
  if (!parts.startedLabel && !parts.durationLabel) {
    return null;
  }
  if (parts.startedLabel && parts.durationLabel) {
    const suffix = parts.isRunning ? " so far" : "";
    return `${parts.startedLabel} · ${parts.durationLabel}${suffix}`;
  }
  return parts.startedLabel ?? parts.durationLabel;
};

/** Step rows: duration only (wall clock is shown on the parent stage). */
export const formatForgeWorkflowDurationOnlyLine = (parts: ForgeWorkflowTimingParts): string | null => {
  if (!parts.durationLabel) {
    return null;
  }
  return parts.isRunning ? `${parts.durationLabel} so far` : parts.durationLabel;
};
