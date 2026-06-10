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

function formatGeminiToolCommand(toolName: string, parameters: unknown): string {
  if (isRecord(parameters)) {
    const command = stringValue(parameters.command);
    if (command) return command;
    const filePath = stringValue(parameters.file_path) || stringValue(parameters.path);
    if (filePath) return `${toolName} ${filePath}`;
  }
  return toolName;
}

function flushGeminiAssistantBuffer(assistantBuffer: string, helpers: JsonlLineHelpers): LoopOutputEvent[] {
  const buffered = assistantBuffer.trim();
  if (!buffered) return [];
  return appendAssistantProtocolText(helpers, buffered);
}

export function createGeminiStreamJsonOutputNormalizer(context: LoopOutputNormalizerContext): LoopOutputNormalizer {
  let assistantBuffer = "";

  return createJsonlLoopOutputNormalizer(context, {
    normalizeLine(line, helpers) {
      const trimmed = line.trim();
      if (!trimmed) return [];

      let decoded: unknown;
      try {
        decoded = JSON.parse(trimmed) as unknown;
      } catch {
        return [];
      }

      if (!isRecord(decoded)) return [];

      switch (stringValue(decoded.type)) {
        case "message": {
          if (stringValue(decoded.role) !== "assistant") return [];
          const content = stringValue(decoded.content);
          if (!content) return [];
          assistantBuffer += content;
          if (decoded.delta === true) return [];
          const events = flushGeminiAssistantBuffer(assistantBuffer, helpers);
          assistantBuffer = "";
          return events;
        }
        case "tool_use": {
          const events = flushGeminiAssistantBuffer(assistantBuffer, helpers);
          assistantBuffer = "";
          events.push(createLoopOutputEvent(helpers.context, {
            kind: "tool",
            command: formatGeminiToolCommand(stringValue(decoded.tool_name), decoded.parameters),
            output: "",
            status: "completed"
          }));
          return events;
        }
        case "tool_result": {
          const output = stringValue(decoded.output)
            || (isRecord(decoded.error) ? stringValue(decoded.error.message) : "");
          if (!output.trim()) return [];
          return [createLoopOutputEvent(helpers.context, {
            kind: "tool",
            command: "Tool result",
            output: output.trim(),
            status: stringValue(decoded.status) === "error" ? "failed" : "completed"
          })];
        }
        case "error":
          return [createLoopOutputEvent(helpers.context, {
            kind: "notice",
            tone: stringValue(decoded.severity) === "error" ? "warning" : "info",
            message: stringValue(decoded.message) || "Gemini reported an issue."
          })];
        case "result": {
          const events = flushGeminiAssistantBuffer(assistantBuffer, helpers);
          assistantBuffer = "";
          if (isRecord(decoded.stats)) {
            events.push(createLoopOutputEvent(helpers.context, {
              kind: "usage",
              inputTokens: numberValue(decoded.stats.input_tokens),
              cachedInputTokens: numberValue(decoded.stats.cached),
              outputTokens: numberValue(decoded.stats.output_tokens)
            }));
          }
          if (stringValue(decoded.status) === "error" && isRecord(decoded.error)) {
            events.push(createLoopOutputEvent(helpers.context, {
              kind: "notice",
              tone: "warning",
              message: stringValue(decoded.error.message) || "Gemini reported an error."
            }));
          }
          return events;
        }
        default:
          return [];
      }
    },
    finalize(helpers, events, finalOutput) {
      if (assistantBuffer.trim()) {
        events.push(...flushGeminiAssistantBuffer(assistantBuffer, helpers));
        assistantBuffer = "";
      }
      if (!helpers.getProtocolText().includes(context.token) && finalOutput.includes(context.token)) {
        helpers.appendProtocolText(finalOutput);
        events.push(...normalizeLoopMessage(context, finalOutput, helpers.seenResults));
      }
      return [
        ...events,
        ...normalizeLoopMessage(context, helpers.getProtocolText(), helpers.seenResults).filter((event) => event.kind === "result")
      ];
    }
  });
}
