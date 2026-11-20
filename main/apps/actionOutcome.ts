import type { ConnectorToolCallResult } from "@main/types/connectors/connectors.types";
import type { AppActionOutcome } from "@main/types/apps/actionOutcome.types";

const SUMMARY_CHARS = 400;
const LOG_CHARS = 4000;
const SUMMARY_FIELDS = 3;

const clip = (text: string, limit: number): string => text.length > limit ? `${text.slice(0, limit)}…` : text;
const textOf = (result: ConnectorToolCallResult): string => result.content.flatMap((part) => part.type === "text" && part.text ? [part.text] : []).join("\n").trim();

/**
 * A tool that answers in JSON gets a plain summary for the toast ("Done · name Ivy Chen · stage customer") while the activity log
 * keeps what it said in full; a tool that answers in prose is shown as it is.
 */
function summarise(text: string, isError: boolean): string {
  if (!text) return isError ? "The action failed." : "Done.";
  if (!/^[[{]/.test(text)) return clip(text, SUMMARY_CHARS);
  try {
    const parsed: unknown = JSON.parse(text);
    const record = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!record || typeof record !== "object") return isError ? "The action failed." : "Done.";
    const fields = Object.entries(record as Record<string, unknown>).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)).slice(0, SUMMARY_FIELDS);
    const lead = isError ? "Failed" : Array.isArray(parsed) ? `Done · ${parsed.length} ${parsed.length === 1 ? "item" : "items"}` : "Done";
    return fields.length ? `${lead} · ${fields.map(([key, value]) => `${key} ${String(value)}`).join(" · ")}` : lead;
  } catch { return clip(text, SUMMARY_CHARS); }
}

/** The toast line and the full text for the activity log, from one tool result. */
export function describeActionOutcome(result: ConnectorToolCallResult): AppActionOutcome {
  const text = textOf(result);
  return { summary: summarise(text, !!result.isError), full: clip(text, LOG_CHARS) || (result.isError ? "The action failed." : "Done."), isError: !!result.isError };
}
