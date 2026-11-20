import type { AppSourceInputs, AppSpec } from "@shared/types/apps/apps.types";
import type { JsonValue } from "@main/jsonValue";
import { readStatePath } from "./resolveActionArgs";

/** For each source with bound arguments, the state path each bound argument reads. */
export function boundSourceArgs(spec: Pick<AppSpec, "sources">): Record<string, Record<string, string>> {
  const bound: Record<string, Record<string, string>> = {};
  for (const [sourceId, source] of Object.entries(spec.sources)) {
    if (source.kind !== "connector") continue;
    for (const [name, value] of Object.entries(source.args)) {
      if (value && typeof value === "object" && !Array.isArray(value) && typeof value.$state === "string") (bound[sourceId] ??= {})[name] = value.$state;
    }
  }
  return bound;
}

const toJson = (value: unknown): JsonValue => value === undefined ? null : JSON.parse(JSON.stringify(value)) as JsonValue;

/** The current value of every bound source argument, read from app state; only sources with bindings appear. */
export function resolveSourceInputs(bound: Record<string, Record<string, string>>, state: Record<string, unknown>): AppSourceInputs {
  return Object.fromEntries(Object.entries(bound).map(([sourceId, args]) =>
    [sourceId, Object.fromEntries(Object.entries(args).map(([name, path]) => [name, toJson(readStatePath(state, path))]))]));
}

/** Sources whose inputs differ between two resolutions, so only those reload when the user changes a filter. */
export function changedSourceInputs(previous: AppSourceInputs | null, next: AppSourceInputs): string[] {
  return Object.keys(next).filter((sourceId) => !previous || JSON.stringify(previous[sourceId]) !== JSON.stringify(next[sourceId]));
}
