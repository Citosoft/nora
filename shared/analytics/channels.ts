/** IPC channels for analytics; kept free of zod so the preload bridge stays small. */
export const ANALYTICS_CHANNELS = {
  /** Window → main: what this run allows and why, for the Privacy settings copy. */
  runtimeConfig: "analytics:runtime-config",
  /** Window → main: record one analytics event. Main decides whether the current level allows it. */
  track: "analytics:track"
} as const;
