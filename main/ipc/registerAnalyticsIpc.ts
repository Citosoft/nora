import { ANALYTICS_CHANNELS } from "@shared/analytics/channels";
import type { AnalyticsRuntimeConfig } from "@shared/types/analytics.types";
import type { AnalyticsIpcDeps } from "@main/types/analytics/analytics.types";

export function registerAnalyticsIpc(deps: AnalyticsIpcDeps): () => void {
  deps.ipc.handle(ANALYTICS_CHANNELS.runtimeConfig, (): AnalyticsRuntimeConfig => ({ ...deps.runtimeConfig }));
  deps.ipc.handle(ANALYTICS_CHANNELS.track, (event, input) => {
    // Events are validated against the catalog in main; a bad one is dropped, never echoed back.
    if (deps.isAllowedSender(event)) deps.record(input);
  });
  return () => { deps.ipc.removeHandler(ANALYTICS_CHANNELS.runtimeConfig); deps.ipc.removeHandler(ANALYTICS_CHANNELS.track); };
}
