import { z } from "zod";

const id = z.string().min(1).max(512);

/** What a row in the island opens: a native thread, or a terminal agent's session. */
export const islandTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("thread"), conversationId: id }).strict(),
  z.object({ kind: z.literal("terminal-agent"), agentId: id }).strict()
]);

export const islandInteractiveSchema = z.boolean();
export const islandDemoResultSchema = z.enum(["shown", "unsupported", "no-notch"]);
/** What a preview shows: work under way with nothing waiting, or a thread that needs the user leading the island. */
export const islandDemoScenarioSchema = z.enum(["running", "needs-you"]);

/** Island sizes, smallest first; the smallest matches the notch, so the island is never smaller than it. */
export const ISLAND_SIZES = ["notch", "medium", "large"] as const;
export const islandSizeSchema = z.enum(ISLAND_SIZES);
export const notchIslandSettingsSchema = z.object({
  enabled: z.boolean().describe("macOS: show threads and terminal agents around the MacBook notch."),
  alwaysShow: z.boolean().describe("Keep the island showing when nothing is running, for its inbox button."),
  size: islandSizeSchema.describe("notch matches the notch's height; medium and large grow from it.")
}).strict();

/** The most rows the expanded island lists; the rest are summarised as a count. */
export const ISLAND_MAX_ITEMS = 5;
