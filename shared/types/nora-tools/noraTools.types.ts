import type { z } from "zod";
import type { NORA_TOOLS, noraToolsStatusSchema } from "@shared/nora-tools/catalog";

export type NoraToolName = keyof typeof NORA_TOOLS;
export type NoraToolsStatus = z.infer<typeof noraToolsStatusSchema>;
/**
 * Which threads a tool is offered to: Nora's own threads, bot threads, plain write workers (no bot identity), or only bot
 * threads answering in a group/direct chat ("member").
 */
export type NoraToolAudience = "nora" | "bot" | "worker" | "member";
