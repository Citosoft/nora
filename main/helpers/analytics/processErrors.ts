import type { AnalyticsErrorSource } from "@shared/types/analytics.types";

/**
 * Reports main-process crashes and unhandled rejections. `uncaughtExceptionMonitor` observes without replacing
 * Electron's own crash handling; the rejection listener keeps the console warning Node would otherwise print.
 */
export function observeProcessErrors(record: (source: AnalyticsErrorSource, error: unknown, context: string | null) => void): void {
  process.on("uncaughtExceptionMonitor", (error) => record("main", error, "uncaught-exception"));
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection in the main process", reason);
    record("main", reason, "unhandled-rejection");
  });
}
