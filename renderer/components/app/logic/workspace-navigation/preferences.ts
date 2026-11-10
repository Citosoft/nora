import { z } from "zod";
import type { SidebarPreferences } from "@/components/app/types/workspaceNavigation.types";

export const SIDEBAR_PREFERENCES_KEY = "nora-sidebar-navigation";
const preferencesSchema = z.object({
  pinnedWorkspaceIds: z.array(z.string()),
  toolPins: z.record(z.string(), z.array(z.enum(["files", "changes", "documents", "tasks", "development", "workflows", "terminals", "browser"])))
});
export function parseSidebarPreferences(raw: string | null): SidebarPreferences {
  if (!raw) return { pinnedWorkspaceIds: [], toolPins: {} };
  try { return preferencesSchema.parse(JSON.parse(raw)); }
  catch { return { pinnedWorkspaceIds: [], toolPins: {} }; }
}
