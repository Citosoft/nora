import type { JsonValue } from "@main/jsonValue";

/**
 * Catalog props are typed as `literal | expression`, and the renderer resolves expressions before a component sees them; these
 * narrow the resolved value so components never render an unresolved expression object as text.
 */
export const propText = (value: unknown): string => typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "";
export const propNumber = (value: unknown, fallback: number): number => typeof value === "number" && Number.isFinite(value) ? value : fallback;
export const propJson = (value: unknown): JsonValue | undefined => {
  if (value === undefined) return undefined;
  try { return JSON.parse(JSON.stringify(value)) as JsonValue; } catch { return undefined; }
};
export const propChoice = <T extends string>(value: unknown, choices: readonly T[], fallback: T): T => choices.includes(value as T) ? value as T : fallback;
