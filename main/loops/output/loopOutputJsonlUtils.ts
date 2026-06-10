import type { LoopOutputEvent } from "@shared/appTypes";
import type { LoopOutputNormalizer, LoopOutputNormalizerContext } from "@main/types/loopOutputNormalizer.types";
import { normalizeLoopMessage } from "./normalizeLoopMessage";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export interface JsonlLineHelpers {
  context: LoopOutputNormalizerContext;
  seenResults: Set<string>;
  appendProtocolText: (text: string) => void;
  getProtocolText: () => string;
}

export interface CreateJsonlLoopOutputNormalizerOptions {
  normalizeLine: (line: string, helpers: JsonlLineHelpers) => LoopOutputEvent[];
  finalize?: (helpers: JsonlLineHelpers, events: LoopOutputEvent[], finalOutput: string) => LoopOutputEvent[];
}

export function createJsonlLoopOutputNormalizer(
  context: LoopOutputNormalizerContext,
  options: CreateJsonlLoopOutputNormalizerOptions
): LoopOutputNormalizer {
  let pending = "";
  let protocolText = "";
  let receivedOutput = false;
  const seenResults = new Set<string>();

  const helpers: JsonlLineHelpers = {
    context,
    seenResults,
    appendProtocolText: (text) => {
      protocolText += text;
    },
    getProtocolText: () => protocolText
  };

  function drain(flush: boolean): LoopOutputEvent[] {
    const events: LoopOutputEvent[] = [];
    const lines = pending.split(/\r?\n/);
    const trailing = lines.pop() ?? "";
    pending = flush ? "" : trailing;
    for (const line of lines) events.push(...options.normalizeLine(line, helpers));
    if (flush && trailing) events.push(...options.normalizeLine(trailing, helpers));
    return events;
  }

  function defaultFinalize(events: LoopOutputEvent[], finalOutput: string): LoopOutputEvent[] {
    if (!protocolText.includes(context.token) && finalOutput.includes(context.token)) {
      helpers.appendProtocolText(finalOutput);
      events.push(...normalizeLoopMessage(context, finalOutput, seenResults));
    }
    const parsed = normalizeLoopMessage(context, protocolText, seenResults);
    return [...events, ...parsed.filter((event) => event.kind === "result")];
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
      if (options.finalize) {
        return options.finalize(helpers, events, finalOutput);
      }
      return defaultFinalize(events, finalOutput);
    },
    getProtocolText: () => protocolText
  };
}

export function appendAssistantProtocolText(helpers: JsonlLineHelpers, text: string): LoopOutputEvent[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  helpers.appendProtocolText(`${trimmed}\n`);
  return normalizeLoopMessage(helpers.context, trimmed, helpers.seenResults);
}
