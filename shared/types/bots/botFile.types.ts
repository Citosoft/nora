import type { BotDefinition } from "./bots.types";

export type BotFileField = "connectors" | "account-connectors" | "name" | "role" | "provider" | "instance" | "model" | "reasoning" | "permission" | "shape" | "palette" | "eyes" | "seed" | "revision";
export type BotFileParse = { ok: true; bot: BotDefinition } | { ok: false; message: string };
/** One JSON-array front-matter field: missing, parsed, or rejected with the message to show. */
export type BotFileJsonField<T> = { kind: "absent" } | { kind: "value"; value: T } | { kind: "invalid"; message: string };
