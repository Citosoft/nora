/** Background refresh cadence for usage readouts while a surface shows them. */
export const TOOL_USAGE_POLL_INTERVAL_MS = 5 * 60 * 1000;
/** Usage loaded this recently is reused; provider usage endpoints rate limit aggressive polling. */
export const TOOL_USAGE_MAX_AGE_MS = 60 * 1000;
