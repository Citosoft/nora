import { isDeepStrictEqual } from "node:util";
import type { AppSettings } from "@shared/types/system.types";
import type { AnalyticsEvent } from "@shared/types/analytics.types";
import { toAnalyticsIdentifier } from "./identifier";

// Groups whose individual options are worth seeing; other objects are reported by name only.
const EXPANDED_GROUPS: ReadonlySet<string> = new Set(["lifecycle", "notchIsland", "ai", "voice", "threadBackdrop"]);
// Groups that can hold keys, names or free text: report that they changed, never what to.
const NAME_ONLY: ReadonlySet<string> = new Set(["ai.apiKeys", "ai.modelByProvider", "ai.runtimeModelByProvider", "personalization", "terminalPresets", "terminalQuickLaunchDefaults"]);

function reportableValue(setting: string, value: unknown): string | number | boolean | null {
  if (NAME_ONLY.has(setting)) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  return typeof value === "string" ? toAnalyticsIdentifier(value) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** One `settings.changed` per option that differs, with its new value only when that value is a code-defined option. */
export function settingsChangeEvents(previous: AppSettings, next: AppSettings): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = [];
  const visit = (prefix: string, before: unknown, after: unknown, expand: boolean): void => {
    if (isDeepStrictEqual(before, after)) return;
    if (expand && isRecord(before) && isRecord(after)) {
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) visit(`${prefix}.${key}`, before[key], after[key], false);
      return;
    }
    events.push({ name: "settings.changed", properties: { setting: prefix, value: reportableValue(prefix, after) } });
  };
  for (const key of Object.keys(next) as Array<keyof AppSettings>) visit(key, previous[key], next[key], EXPANDED_GROUPS.has(key));
  return events;
}
