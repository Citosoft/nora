import { noraToolingClient } from "@/components/app/clients/noraToolingClient";
import { TOOL_USAGE_MAX_AGE_MS } from "@/components/app/constants/toolUsage";
import { createToolUsageStore } from "./toolUsageStore";

/** The app-wide usage cache shared by the sidebar usage panel and the composer usage widget. */
export const appToolUsageStore = createToolUsageStore({
  fetchUsage: (toolId) => noraToolingClient.getToolUsage(toolId),
  now: () => Date.now(),
  maxAgeMs: TOOL_USAGE_MAX_AGE_MS
});
