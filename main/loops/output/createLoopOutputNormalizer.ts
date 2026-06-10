import type { LoopOutputNormalizer, LoopOutputNormalizerContext } from "@main/types/loopOutputNormalizer.types";
import { createCodexJsonOutputNormalizer } from "./codexJsonOutputNormalizer";
import { createPlainTextOutputNormalizer } from "./plainTextOutputNormalizer";

export function createLoopOutputNormalizer(context: LoopOutputNormalizerContext): LoopOutputNormalizer {
  return context.toolId === "codex"
    ? createCodexJsonOutputNormalizer(context)
    : createPlainTextOutputNormalizer(context);
}
