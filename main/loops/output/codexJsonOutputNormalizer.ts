import type { LoopOutputEvent } from "@shared/appTypes";
import type { LoopOutputNormalizer, LoopOutputNormalizerContext } from "@main/types/loopOutputNormalizer.types";
import { createLoopOutputEvent } from "./loopOutputEventFactory";
import {
  appendAssistantProtocolText,
  createJsonlLoopOutputNormalizer,
  isRecord,
  numberValue,
  stringValue,
  type JsonlLineHelpers
} from "./loopOutputJsonlUtils";
import { normalizeLoopMessage } from "./normalizeLoopMessage";

function normalizeCodexLine(line: string, helpers: JsonlLineHelpers): LoopOutputEvent[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  let decoded: unknown;
  try {
    decoded = JSON.parse(trimmed) as unknown;
  } catch {
    helpers.appendProtocolText(`${line}\n`);
    return normalizeLoopMessage(helpers.context, line, helpers.seenResults);
  }
  if (!isRecord(decoded)) return [];
  const type = stringValue(decoded.type);
  if (type === "error") {
    return [createLoopOutputEvent(helpers.context, {
      kind: "notice",
      tone: "warning",
      message: stringValue(decoded.message) || "Codex reported an error."
    })];
  }
  if (type === "turn.completed" && isRecord(decoded.usage)) {
    return [createLoopOutputEvent(helpers.context, {
      kind: "usage",
      inputTokens: numberValue(decoded.usage.input_tokens),
      cachedInputTokens: numberValue(decoded.usage.cached_input_tokens),
      outputTokens: numberValue(decoded.usage.output_tokens)
    })];
  }
  if (type !== "item.completed" || !isRecord(decoded.item)) return [];
  const itemType = stringValue(decoded.item.type);
  if (itemType === "agent_message") {
    return appendAssistantProtocolText(helpers, stringValue(decoded.item.text));
  }
  if (itemType === "command_execution") {
    const exitCode = numberValue(decoded.item.exit_code);
    return [createLoopOutputEvent(helpers.context, {
      kind: "tool",
      command: stringValue(decoded.item.command),
      output: stringValue(decoded.item.aggregated_output),
      status: exitCode === null || exitCode === 0 ? "completed" : "failed"
    })];
  }
  if (itemType === "file_change") {
    const changes = stringValue(decoded.item.changes) || stringValue(decoded.item.diff);
    if (!changes) return [];
    return [createLoopOutputEvent(helpers.context, {
      kind: "tool",
      command: "Applied file changes",
      output: changes,
      status: "completed"
    })];
  }
  return [];
}

export function createCodexJsonOutputNormalizer(context: LoopOutputNormalizerContext): LoopOutputNormalizer {
  return createJsonlLoopOutputNormalizer(context, {
    normalizeLine: normalizeCodexLine
  });
}
