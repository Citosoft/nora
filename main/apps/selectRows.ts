import jsonata from "jsonata";
import { APP_SOURCE_ROW_LIMIT } from "@shared/apps/contracts";
import type { JsonValue } from "@main/jsonValue";
import type { ConnectorToolCallResult } from "@main/types/connectors/connectors.types";
import type { SelectedRows } from "@main/types/apps/select.types";

/** Expressions that run past this are treated as broken rather than left to spin. */
const EVALUATE_TIMEOUT_MS = 2_000;

/** Parses a `select` expression; the message names what JSONata could not read so the agent can fix the expression. */
function compileExpression(expression: string) {
  const compiled = (() => {
    try { return jsonata(expression); }
    catch (error) { throw new Error(`The select expression could not be parsed: ${error instanceof Error ? error.message : "unknown error"}`); }
  })();
  return async <T>(input: JsonValue, normalize: (value: unknown) => T): Promise<T> => {
    let timer: NodeJS.Timeout | undefined;
    const deadline = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error("The select expression took too long.")), EVALUATE_TIMEOUT_MS); });
    try {
      const value: unknown = await Promise.race([compiled.evaluate(input), deadline]);
      return normalize(value);
    } catch (error) {
      throw new Error(`The select expression failed: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally { clearTimeout(timer); }
  };
}

export function compileSelect(expression: string): { evaluate(input: JsonValue): Promise<JsonValue> } {
  const evaluate = compileExpression(expression);
  return { evaluate: (input) => evaluate(input, toJson) };
}

/** JSONata returns plain data, but sequences carry hidden flags; serialising once makes the result a JSON value with no surprises. */
function toJson(value: unknown): JsonValue {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

/**
 * What a `select` expression runs against: the tool's structured content when it declares one, else its text content parsed as
 * JSON, else the text itself. Agents see the same value when they sample a tool, so expressions written then hold later.
 */
export function toolResultInput(result: ConnectorToolCallResult): JsonValue {
  if (result.structuredContent) return toJson(result.structuredContent);
  const texts = result.content.flatMap((part) => part.type === "text" && typeof part.text === "string" ? [part.text] : []);
  if (texts.length === 1) {
    const [text] = texts;
    try { return JSON.parse(text ?? "") as JsonValue; } catch { return text ?? ""; }
  }
  return texts.map((text) => { try { return JSON.parse(text) as JsonValue; } catch { return text; } });
}

/** Applies a `select` expression and bounds the rows the window receives. */
export async function selectRows(expression: string, input: JsonValue): Promise<SelectedRows> {
  return compileExpression(expression)(input, (value) => {
    const truncated = Array.isArray(value) && value.length > APP_SOURCE_ROW_LIMIT;
    return { rows: toJson(truncated ? value.slice(0, APP_SOURCE_ROW_LIMIT) : value), truncated };
  });
}
