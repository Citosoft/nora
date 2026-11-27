import { z } from "zod";
import type { AppImportModelRef } from "@shared/types/app-import/appImportPlan.types";
import type { T3CodeProviderResolver } from "@main/types/app-import/t3Code.types";

/** Current selections name a provider instance; pre-instance rows named the provider directly. */
const modelSelectionSchema = z.union([
  z.object({ instanceId: z.string().min(1), model: z.string().min(1) }),
  z.object({ provider: z.string().min(1), model: z.string().min(1) }).transform(({ provider, model }) => ({ instanceId: provider, model }))
]);

export function parseT3CodeModelSelection(raw: unknown, resolveProvider: T3CodeProviderResolver): AppImportModelRef | undefined {
  const value = typeof raw === "string" ? parseJson(raw) : raw;
  const parsed = modelSelectionSchema.safeParse(value);
  return parsed.success ? { ...resolveProvider(parsed.data.instanceId), model: parsed.data.model } : undefined;
}

export function parseJson(text: string | null | undefined): unknown {
  if (!text) return undefined;
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    return undefined;
  }
}
