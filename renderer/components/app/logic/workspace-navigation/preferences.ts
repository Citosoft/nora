import { z } from "zod";
import type { SidebarPreferences } from "@/components/app/types/workspaceNavigation.types";
import { defaultWorkspaceView } from "./viewState";
import { workspaceAvatarColors } from "./avatar";

export const SIDEBAR_PREFERENCES_KEY = "nora-sidebar-navigation";
const toolSchema = z.enum(["files", "changes", "documents", "tasks", "workflows", "terminals", "browser"]);
const storedToolSchema = z.union([toolSchema, z.literal("development")]).transform((tool) => tool === "development" ? "changes" as const : tool);
const viewSchema = z.object({
  activeTool: toolSchema.nullable().catch(null), terminalId: z.string().nullable().catch(null), browserTabId: z.string().nullable().catch(null),
  filePath: z.string().nullable().catch(null), documentPath: z.string().nullable().catch(null),
  documentKind: z.enum(["notes", "specs"]).catch("notes"), changesTab: z.enum(["changes", "worktrees"]).catch("changes"),
  reviewMode: z.enum(["file", "all"]).catch("file")
}).catch(defaultWorkspaceView);
const preferencesSchema = z.object({
  pinnedWorkspaceIds: z.array(z.string()),
  toolPins: z.record(z.string(), z.array(storedToolSchema).transform((tools) => [...new Set(tools)].slice(0, 4))),
  threadGrouping: z.enum(["none", "workspace", "activity"]).catch("none"),
  workspaceAvatarColors: z.record(z.string(), z.enum(workspaceAvatarColors.map((color) => color.id))).catch({}),
  workspaceViews: z.record(z.string(), viewSchema).catch({})
});
export function parseSidebarPreferences(raw: string | null): SidebarPreferences {
  if (!raw) return { pinnedWorkspaceIds: [], toolPins: {}, threadGrouping: "none", workspaceAvatarColors: {}, workspaceViews: {} };
  try { return preferencesSchema.parse(JSON.parse(raw)); }
  catch { return { pinnedWorkspaceIds: [], toolPins: {}, threadGrouping: "none", workspaceAvatarColors: {}, workspaceViews: {} }; }
}
