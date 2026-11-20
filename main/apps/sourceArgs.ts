import type { AppConnectorSource, AppSource, AppSourceArg } from "@shared/types/apps/apps.types";
import type { JsonValue } from "@main/jsonValue";

export const isStateBinding = (value: AppSourceArg): value is { $state: string } =>
  !!value && typeof value === "object" && !Array.isArray(value) && "$state" in value && typeof value.$state === "string";

/** Whether any of a source's arguments reads app state, so its first load must wait for the window's values; files take no arguments. */
export const sourceHasBoundArgs = (source: AppSource): boolean => source.kind === "connector" && Object.values(source.args).some(isStateBinding);

/**
 * The arguments a source call is made with: literals as written, bound ones from the window's latest inputs. A bound argument
 * the window has no value for is left out, so an unset filter means "no filter" rather than `null` the tool may reject.
 */
export function resolveSourceArgs(source: Pick<AppConnectorSource, "args">, inputs: Record<string, JsonValue> | undefined): Record<string, JsonValue> {
  const resolved: Record<string, JsonValue> = {};
  for (const [name, value] of Object.entries(source.args)) {
    if (!isStateBinding(value)) { resolved[name] = value; continue; }
    const input = inputs?.[name];
    if (input !== undefined && input !== null && input !== "") resolved[name] = input;
  }
  return resolved;
}
