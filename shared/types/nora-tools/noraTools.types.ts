import type { z } from "zod";
import type { NORA_TOOLS, noraToolsStatusSchema } from "@shared/nora-tools/catalog";

export type NoraToolName = keyof typeof NORA_TOOLS;
export type NoraToolsStatus = z.infer<typeof noraToolsStatusSchema>;
/** Which threads a tool is offered to: Nora threads, bot threads, or only bot threads answering in a group chat ("member"). */
export type NoraToolAudience = "nora" | "bot" | "member";
