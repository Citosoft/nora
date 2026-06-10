import type { LoopOutputEvent } from "@shared/appTypes";
import type { LoopOutputNormalizer, LoopOutputNormalizerContext } from "@main/types/loopOutputNormalizer.types";
import { createLoopOutputEvent } from "./loopOutputEventFactory";
import {
  appendAssistantProtocolText,
  createJsonlLoopOutputNormalizer,
  isRecord,
  numberValue,
  stringValue
} from "./loopOutputJsonlUtils";
import { normalizeLoopMessage } from "./normalizeLoopMessage";

function formatClaudeToolCommand(name: string, input: unknown): string {
  if (isRecord(input)) {
    const command = stringValue(input.command);
    if (command) return command;
    const filePath = stringValue(input.file_path) || stringValue(input.path);
    if (filePath) return `${name} ${filePath}`;
  }
  return name;
}

function collectClaudeToolResults(content: unknown): Array<{ output: string; isError: boolean }> {
  if (!Array.isArray(content)) return [];

  return content.flatMap((entry) => {
    if (!isRecord(entry) || stringValue(entry.type) !== "tool_result") return [];
    const output = typeof entry.content === "string"
      ? entry.content
      : Array.isArray(entry.content)
        ? entry.content.flatMap((block) => {
          if (!isRecord(block)) return [];
          return stringValue(block.text) ? [stringValue(block.text)] : [];
        }).join("\n")
        : "";
    const trimmed = output.trim();
    if (!trimmed) return [];
    return [{ output: trimmed, isError: entry.is_error === true }];
  });
}

function normalizeClaudeAssistantMessage(
  message: Record<string, unknown>,
  helpers: Parameters<typeof appendAssistantProtocolText>[0]
): LoopOutputEvent[] {
  const events: LoopOutputEvent[] = [];
  const content = message.content;

  if (typeof content === "string") {
    events.push(...appendAssistantProtocolText(helpers, content));
    return events;
  }

  if (!Array.isArray(content)) return events;

  const textParts: string[] = [];
  for (const entry of content) {
    if (!isRecord(entry)) continue;
    const blockType = stringValue(entry.type);
    if (blockType === "text") {
      const text = stringValue(entry.text).trim();
      if (text) textParts.push(text);
      continue;
    }
    if (blockType === "tool_use") {
      if (textParts.length > 0) {
        events.push(...appendAssistantProtocolText(helpers, textParts.join("\n\n")));
        textParts.length = 0;
      }
      events.push(createLoopOutputEvent(helpers.context, {
        kind: "tool",
        command: formatClaudeToolCommand(stringValue(entry.name), entry.input),
        output: "",
        status: "completed"
      }));
    }
  }

  if (textParts.length > 0) {
    events.push(...appendAssistantProtocolText(helpers, textParts.join("\n\n")));
  }
  return events;
}

function normalizeClaudeLine(line: string, helpers: Parameters<typeof appendAssistantProtocolText>[0]): LoopOutputEvent[] {
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

  if (type === "system" && stringValue(decoded.subtype) === "api_retry") {
    return [createLoopOutputEvent(helpers.context, {
      kind: "notice",
      tone: "warning",
      message: stringValue(decoded.error) || "Claude is retrying the request."
    })];
  }

  if (type === "assistant" && isRecord(decoded.message)) {
    return normalizeClaudeAssistantMessage(decoded.message, helpers);
  }

  if (type === "user" && isRecord(decoded.message)) {
    return collectClaudeToolResults(decoded.message.content).map((result) => createLoopOutputEvent(helpers.context, {
      kind: "tool",
      command: "Tool result",
      output: result.output,
      status: result.isError ? "failed" : "completed"
    }));
  }

  if (type === "result") {
    const events: LoopOutputEvent[] = [];
    const resultText = stringValue(decoded.result);
    if (resultText) {
      events.push(...appendAssistantProtocolText(helpers, resultText));
    }
    if (isRecord(decoded.usage)) {
      events.push(createLoopOutputEvent(helpers.context, {
        kind: "usage",
        inputTokens: numberValue(decoded.usage.input_tokens),
        cachedInputTokens: numberValue(decoded.usage.cache_read_input_tokens)
          ?? numberValue(decoded.usage.cached_input_tokens),
        outputTokens: numberValue(decoded.usage.output_tokens)
      }));
    }
    return events;
  }

  return [];
}

export function createClaudeStreamJsonOutputNormalizer(context: LoopOutputNormalizerContext): LoopOutputNormalizer {
  return createJsonlLoopOutputNormalizer(context, {
    normalizeLine: normalizeClaudeLine
  });
}
