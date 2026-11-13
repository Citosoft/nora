import { threadSortSchema } from "../thread-workspace/sorting";
import { threadSourceFilterSchema } from "../thread-workspace/sources";
import { z } from "zod";
import type { SidebarPreferences } from "@/components/app/types/workspaceNavigation.types";
import { defaultWorkspaceView } from "./viewState";
import { workspaceAvatarColors } from "./avatar";

export const SIDEBAR_PREFERENCES_KEY = "nora-sidebar-navigation";
const toolSchema = z.enum(["worktrees", "documents", "tasks", "workflows", "terminals", "browser"]);
// Discard retired tool pins without resetting unrelated sidebar preferences.
const storedToolSchema = z.union([toolSchema, z.enum(["files", "changes", "development"]).transform(() => null)]);
const storedToolsSchema = z.array(storedToolSchema).transform((tools) =>
  [...new Set(tools.filter((tool) => tool !== null))].slice(0, 4));
const viewSchema = z.object({
  activeTool: toolSchema.nullable().catch(null), terminalId: z.string().nullable().catch(null), browserTabId: z.string().nullable().catch(null),
  documentPath: z.string().nullable().catch(null),
  documentKind: z.enum(["notes", "specs"]).catch("notes")
}).catch(defaultWorkspaceView);
const preferencesSchema = z.object({
  sidebarMode: z.enum(["threads", "bots"]).catch("threads"),
  pinnedWorkspaceIds: z.array(z.string()),
  toolPins: z.record(z.string(), storedToolsSchema),
  threadGrouping: z.enum(["none", "workspace", "activity", "source", "provider"]).catch("none"),
  memberThreads: z.enum(["visible", "hidden"]).catch("visible"),
  threadSourceFilter: threadSourceFilterSchema.catch("all"),
  threadSort: threadSortSchema.catch("recent"),
  workspaceAvatarColors: z.record(z.string(), z.enum(workspaceAvatarColors.map((color) => color.id))).catch({}),
  workspaceViews: z.record(z.string(), viewSchema).catch({})
});
function defaultSidebarPreferences(): SidebarPreferences {
  return { sidebarMode: "threads", pinnedWorkspaceIds: [], toolPins: {}, threadGrouping: "none", memberThreads: "visible", threadSourceFilter: "all", threadSort: "recent", workspaceAvatarColors: {}, workspaceViews: {} };
}
export function parseSidebarPreferences(raw: string | null): SidebarPreferences {
  if (!raw) return defaultSidebarPreferences();
  try { return preferencesSchema.parse(JSON.parse(raw)); }
  catch { return defaultSidebarPreferences(); }
}
