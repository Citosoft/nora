import type { BotDefinition } from "./bots.types";

export type BotFileField = "name" | "role" | "provider" | "instance" | "model" | "reasoning" | "permission" | "shape" | "palette" | "eyes" | "seed" | "revision";
export type BotFileParse = { ok: true; bot: BotDefinition } | { ok: false; message: string };
