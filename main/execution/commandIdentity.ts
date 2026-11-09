import { createHash } from "node:crypto";
import type { JsonValue } from "@main/types/execution/json.types";

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

export function commandFingerprint(value: JsonValue): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}
