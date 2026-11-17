/** The periods the simulated build dashboard can report on. */
export type BuildRange = "7d" | "30d";
// Type aliases rather than interfaces, so the data is assignable to JSON values in tool results.
export type BuildDay = { label: string; passed: number; failed: number };
/** Synthetic data behind the simulated widget; the tool result's `structuredContent`. */
export type BuildHealth = { project: string; range: BuildRange; days: BuildDay[] };
