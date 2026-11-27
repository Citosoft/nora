import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { RendererAnalyticsEvent } from "@shared/types/analytics.types";

/**
 * Sends an event to the main process, which validates it, checks the user's analytics choice and adds the installation
 * ID. The window never talks to PostHog itself, so there is one identity and one consent check for the whole app.
 */
export function trackAnalyticsEvent(event: RendererAnalyticsEvent): void {
  noraSystemClient.trackAnalytics(event).catch(() => {
    /* best effort: analytics must never surface as an app error */
  });
}

// Error names become event properties, so keep them to identifier characters.
function errorName(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  return /^[\w.:@-]{1,80}$/.test(name) ? name : "Error";
}

/** Reports a renderer error. Main drops the message and stack unless the user opted in, and scrubs them when it keeps them. */
export function trackAnalyticsError(error: unknown, context: string): void {
  trackAnalyticsEvent({
    name: "error.occurred",
    properties: {
      source: "renderer", errorName: errorName(error), errorCode: null, context,
      ...(error instanceof Error ? { message: error.message.slice(0, 2_000), ...(error.stack ? { stack: error.stack.slice(0, 8_000) } : {}) } : {})
    }
  });
}

/** Reports errors nothing else caught. Call once when the window starts. */
export function observeWindowErrors(): void {
  window.addEventListener("error", (event) => trackAnalyticsError(event.error ?? event.message, "window-error"));
  window.addEventListener("unhandledrejection", (event) => trackAnalyticsError(event.reason, "unhandled-rejection"));
}
