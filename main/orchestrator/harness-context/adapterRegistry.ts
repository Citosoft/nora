import type { HarnessContextAdapter } from "../../types/harnessContext.types";
import { claudeHarnessContextAdapter } from "./claudeAdapter";
import { codexHarnessContextAdapter } from "./codexAdapter";
import { cursorHarnessContextAdapter } from "./cursorAdapter";
import { geminiHarnessContextAdapter } from "./geminiAdapter";

const harnessContextAdapters: readonly HarnessContextAdapter[] = [
  claudeHarnessContextAdapter,
  codexHarnessContextAdapter,
  geminiHarnessContextAdapter,
  cursorHarnessContextAdapter
];

export function getHarnessContextAdapter(toolId: string): HarnessContextAdapter | null {
  return harnessContextAdapters.find((adapter) => adapter.toolId === toolId) || null;
}
