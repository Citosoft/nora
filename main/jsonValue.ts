export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = {
  [key: string]: JsonValue;
};

export function isJsonObject(value: JsonValue | unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function getJsonArray(value: JsonValue | unknown): JsonValue[] {
  return Array.isArray(value) ? value : [];
}

export function getJsonObject(value: JsonValue | unknown): JsonObject | null {
  return isJsonObject(value) ? value : null;
}

export function getString(value: JsonValue | unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function getNumber(value: JsonValue | unknown): number | null {
  return typeof value === "number" ? value : null;
}

export function getBoolean(value: JsonValue | unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
