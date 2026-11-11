import type { LoopOutputNormalizer, LoopOutputNormalizerContext } from "@main/types/loopOutputNormalizer.types";
import { createClaudeStreamJsonOutputNormalizer } from "./claudeStreamJsonOutputNormalizer";
import { createCodexJsonOutputNormalizer } from "./codexJsonOutputNormalizer";
import { createPlainTextOutputNormalizer } from "./plainTextOutputNormalizer";

export function createLoopOutputNormalizer(context: LoopOutputNormalizerContext): LoopOutputNormalizer {
  switch (context.toolId) {
    case "codex":
      return createCodexJsonOutputNormalizer(context);
    case "claude":
      return createClaudeStreamJsonOutputNormalizer(context);
    default:
      return createPlainTextOutputNormalizer(context);
  }
}
