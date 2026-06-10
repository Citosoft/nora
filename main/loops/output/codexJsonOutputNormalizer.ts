import type { LoopOutputEvent } from "@shared/appTypes";
import type { LoopOutputNormalizer, LoopOutputNormalizerContext } from "@main/types/loopOutputNormalizer.types";
import { createLoopOutputEvent } from "./loopOutputEventFactory";
import { normalizeLoopMessage } from "./normalizeLoopMessage";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function createCodexJsonOutputNormalizer(context: LoopOutputNormalizerContext): LoopOutputNormalizer {
  let pending = "";
  let protocolText = "";
  let receivedOutput = false;
  const seenResults = new Set<string>();

  function normalizeLine(line: string): LoopOutputEvent[] {
    const trimmed = line.trim();
    if (!trimmed) return [];
    let decoded: unknown;
    try {
      decoded = JSON.parse(trimmed) as unknown;
    } catch {
      protocolText += `${line}\n`;
      return normalizeLoopMessage(context, line, seenResults);
    }
    if (!isRecord(decoded)) return [];
    const type = stringValue(decoded.type);
    if (type === "error") {
      return [createLoopOutputEvent(context, {
        kind: "notice",
        tone: "warning",
        message: stringValue(decoded.message) || "Codex reported an error."
      })];
    }
    if (type === "turn.completed" && isRecord(decoded.usage)) {
      return [createLoopOutputEvent(context, {
        kind: "usage",
        inputTokens: numberValue(decoded.usage.input_tokens),
        cachedInputTokens: numberValue(decoded.usage.cached_input_tokens),
        outputTokens: numberValue(decoded.usage.output_tokens)
      })];
    }
    if (type !== "item.completed" || !isRecord(decoded.item)) return [];
    const itemType = stringValue(decoded.item.type);
    if (itemType === "agent_message") {
      const text = stringValue(decoded.item.text);
      protocolText += `${text}\n`;
      return normalizeLoopMessage(context, text, seenResults);
    }
    if (itemType === "command_execution") {
      const exitCode = numberValue(decoded.item.exit_code);
      return [createLoopOutputEvent(context, {
        kind: "tool",
        command: stringValue(decoded.item.command),
        output: stringValue(decoded.item.aggregated_output),
        status: exitCode === null || exitCode === 0 ? "completed" : "failed"
      })];
    }
    if (itemType === "file_change") {
      const changes = stringValue(decoded.item.changes) || stringValue(decoded.item.diff);
      if (!changes) return [];
      return [createLoopOutputEvent(context, {
        kind: "tool",
        command: "Applied file changes",
        output: changes,
        status: "completed"
      })];
    }
    return [];
  }

  function drain(flush: boolean): LoopOutputEvent[] {
    const events: LoopOutputEvent[] = [];
    const lines = pending.split(/\r?\n/);
    const trailing = lines.pop() ?? "";
    pending = flush ? "" : trailing;
    for (const line of lines) events.push(...normalizeLine(line));
    if (flush && trailing) events.push(...normalizeLine(trailing));
    return events;
  }

  return {
    push(chunk) {
      receivedOutput ||= chunk.length > 0;
      pending += chunk;
      return drain(false);
    },
    finish(finalOutput) {
      if (!receivedOutput) pending += finalOutput;
      const events = drain(true);
      if (!protocolText.includes(context.token) && finalOutput.includes(context.token)) {
        protocolText += finalOutput;
        events.push(...normalizeLoopMessage(context, finalOutput, seenResults));
      }
      const parsed = normalizeLoopMessage(context, protocolText, seenResults);
      return [...events, ...parsed.filter((event) => event.kind === "result")];
    },
    getProtocolText: () => protocolText
  };
}
