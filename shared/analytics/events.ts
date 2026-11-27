import { z } from "zod";
import type { AnalyticsEventName, AnalyticsTier, RendererAnalyticsEvent } from "@shared/types/analytics.types";

/**
 * The lowest level at which each event may be sent. Anonymous events are product counts that carry no personal data or
 * free text; detailed events describe how someone moves through the app and need opt-in.
 */
export const ANALYTICS_EVENT_TIERS: Readonly<Record<AnalyticsEventName, AnalyticsTier>> = {
  "app.launched": "anonymous",
  "app.session_ended": "anonymous",
  "feature.used": "anonymous",
  "thread.created": "anonymous",
  "turn.started": "anonymous",
  "turn.finished": "anonymous",
  "error.occurred": "anonymous",
  "inventory.reported": "anonymous",
  "settings.changed": "anonymous",
  "view.opened": "detailed",
  "agent.created": "detailed",
  "workspace.focused": "detailed",
  "command.invoked": "detailed"
};

// Identifiers are code-defined names (views, commands, tool IDs), so keep them short and free of spaces or slashes.
const identifier = z.string().trim().min(1).max(80).regex(/^[\w.:@-]+$/);
const count = z.number().int().min(0).max(1_000_000);

/** Validates what the window sends so a renderer bug cannot smuggle extra properties or text into an event. */
export const rendererAnalyticsEventSchema: z.ZodType<RendererAnalyticsEvent> = z.discriminatedUnion("name", [
  z.object({ name: z.literal("view.opened"), properties: z.object({ view: identifier }).strict() }).strict(),
  z.object({
    name: z.literal("agent.created"),
    properties: z.object({
      toolId: identifier, mode: identifier, targetKind: identifier,
      via: z.enum(["task-panel", "task-reference", "task-planner", "dialog", "forge-issue", "shortcut"]),
      hasTask: z.boolean(), workspaceCount: count
    }).strict()
  }).strict(),
  z.object({ name: z.literal("workspace.focused"), properties: z.object({ kind: identifier, workspaceCount: count }).strict() }).strict(),
  z.object({ name: z.literal("command.invoked"), properties: z.object({ command: identifier, via: z.enum(["keybinding", "menu"]) }).strict() }).strict(),
  z.object({
    name: z.literal("error.occurred"),
    properties: z.object({
      source: z.literal("renderer"), errorName: identifier, errorCode: identifier.nullable(), context: identifier.nullable(),
      message: z.string().max(2_000).optional(), stack: z.string().max(8_000).optional()
    }).strict()
  }).strict()
]);
