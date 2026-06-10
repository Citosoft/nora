import type { LoopOutputNormalizer } from "@main/types/loopOutputNormalizer.types";
import type { LoopOutputNormalizerContext } from "@main/types/loopOutputNormalizer.types";
import { normalizeLoopMessage } from "./normalizeLoopMessage";

export function createPlainTextOutputNormalizer(context: LoopOutputNormalizerContext): LoopOutputNormalizer {
  let pending = "";
  let protocolText = "";
  let receivedOutput = false;
  const seenResults = new Set<string>();

  function drain(flush: boolean) {
    const boundary = flush ? pending.length : pending.lastIndexOf("\n\n");
    if (boundary <= 0) return [];
    const text = pending.slice(0, boundary);
    pending = pending.slice(boundary);
    protocolText += text;
    return normalizeLoopMessage(context, text, seenResults);
  }

  return {
    push(chunk) {
      receivedOutput ||= chunk.length > 0;
      pending += chunk;
      return drain(false);
    },
    finish(finalOutput) {
      if (!receivedOutput) pending += finalOutput;
      return drain(true);
    },
    getProtocolText: () => protocolText
  };
}
