import type { HarnessContextAdapter } from "../../types/harnessContext.types";
import { claudeHarnessContextAdapter } from "./claudeAdapter";
import { codexHarnessContextAdapter } from "./codexAdapter";
import { cursorHarnessContextAdapter } from "./cursorAdapter";

const harnessContextAdapters: readonly HarnessContextAdapter[] = [
  claudeHarnessContextAdapter,
  codexHarnessContextAdapter,
  cursorHarnessContextAdapter
];

export function getHarnessContextAdapter(toolId: string): HarnessContextAdapter | null {
  return harnessContextAdapters.find((adapter) => adapter.toolId === toolId) || null;
}
