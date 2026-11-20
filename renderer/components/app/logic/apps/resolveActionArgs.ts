import type { AppAction } from "@shared/types/apps/apps.types";
import type { JsonValue } from "@main/jsonValue";

/** JSON Pointer read against app state, mirroring json-render's `$state` resolution. */
export function readStatePath(state: Record<string, unknown>, path: string): unknown {
  let current: unknown = state;
  for (const part of path.split("/").slice(1)) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part.replace(/~1/g, "/").replace(/~0/g, "~")];
  }
  return current;
}
const toJson = (value: unknown): JsonValue => value === undefined ? null : JSON.parse(JSON.stringify(value)) as JsonValue;

/**
 * Resolves an action's argument bindings right before it runs: literals as written, state paths from the app's state model
 * (form fields), item fields from the row the user acted on. Missing values become null so the connector sees every declared argument.
 */
export function resolveActionArgs(action: AppAction, state: Record<string, unknown>, item: JsonValue | undefined): Record<string, JsonValue> {
  const row = item && typeof item === "object" && !Array.isArray(item) ? item : null;
  return Object.fromEntries(Object.entries(action.args).map(([name, binding]) => {
    switch (binding.kind) {
      case "literal": return [name, binding.value];
      case "state": return [name, toJson(readStatePath(state, binding.path))];
      case "item": return [name, row ? row[binding.field] ?? null : null];
    }
  }));
}
