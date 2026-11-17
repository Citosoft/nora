import { z } from "zod";
import type { JsonValue } from "@main/types/execution/rpc.types";

const privateKey = /(?:password|passwd|secret|token|api[_-]?key|authorization|cookie|credential)/i;
const contentSchema = z.object({ type: z.string(), text: z.string().optional(), name: z.string().optional(),
  resource: z.object({ text: z.string().optional() }).optional() });

function redact(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, privateKey.test(key) ? "[redacted]" : redact(entry)]));
  }
  return value;
}

/** Normalize arbitrary tool arguments to bounded, readable text; never forward provider objects to the UI. */
export function formatToolInput(value: JsonValue): string {
  const text = typeof value === "string" ? value : JSON.stringify(redact(value), null, 2);
  return text.length > 12_000 ? `${text.slice(0, 12_000)}\n… input truncated` : text;
}

/** Media is represented by a label, never by embedding opaque URLs or base64 data in the transcript. */
export function formatToolContent(value: JsonValue): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return value === null ? "" : formatToolInput(value);
  return value.map((entry) => {
    const parsed = contentSchema.safeParse(entry);
    if (!parsed.success) return "[Additional tool content]";
    return parsed.data.text ?? parsed.data.resource?.text ?? `[${parsed.data.name ?? parsed.data.type} content]`;
  }).join("\n");
}
