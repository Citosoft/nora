import type { LoopOutputEvent } from "@shared/appTypes";
import type { LoopOutputNormalizerContext } from "@main/types/loopOutputNormalizer.types";
import { parseLoopResult } from "../loopProtocol";
import { createLoopOutputEvent } from "./loopOutputEventFactory";

const RESULT_BLOCK_PATTERN = /<nora-loop-result\s+token="([^"]+)"\s+outcome="(?:continue|complete|approve|changes_requested)">[\s\S]*?<\/nora-loop-result>/g;

export function normalizeLoopMessage(
  context: LoopOutputNormalizerContext,
  markdown: string,
  seenResults: Set<string>
): LoopOutputEvent[] {
  const events: LoopOutputEvent[] = [];
  let cursor = 0;
  RESULT_BLOCK_PATTERN.lastIndex = 0;

  for (let match = RESULT_BLOCK_PATTERN.exec(markdown); match; match = RESULT_BLOCK_PATTERN.exec(markdown)) {
    const preceding = markdown.slice(cursor, match.index).trim();
    if (preceding) {
      events.push(createLoopOutputEvent(context, { kind: "message", markdown: preceding }));
    }
    const parsed = parseLoopResult(match[0], context.token);
    if (parsed) {
      const key = `${context.token}:${parsed.outcome}:${parsed.summary}`;
      if (!seenResults.has(key)) {
        seenResults.add(key);
        events.push(createLoopOutputEvent(context, {
          kind: "result",
          token: context.token,
          outcome: parsed.outcome,
          summary: parsed.summary
        }));
      }
    }
    cursor = match.index + match[0].length;
  }

  const trailing = markdown.slice(cursor).trim();
  if (trailing) {
    events.push(createLoopOutputEvent(context, { kind: "message", markdown: trailing }));
  }
  return events;
}
