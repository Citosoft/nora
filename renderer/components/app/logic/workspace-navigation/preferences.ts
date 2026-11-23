import { threadSortSchema } from "../thread-workspace/sorting";
import { threadSourceFilterSchema } from "../thread-workspace/sources";
import { z } from "zod";
import type { SidebarPreferences } from "@/components/app/types/workspaceNavigation.types";
import type { WorkThreadVisibility } from "@/components/app/types/thread-workspace/navigation.types";
import { defaultWorkspaceView } from "./viewState";
import { workspaceAvatarColors } from "./avatar";

export const SIDEBAR_PREFERENCES_KEY = "nora-sidebar-navigation";
/** Bots' work threads stay out of thread lists until someone chooses to show them. */
export const DEFAULT_WORK_THREAD_VISIBILITY: WorkThreadVisibility = "hidden";
const toolSchema = z.enum(["worktrees", "merge-requests", "issues", "documents", "library", "tasks", "workflows", "terminals", "browser"]);
// Discard retired tool pins without resetting unrelated sidebar preferences.
const storedToolSchema = z.union([toolSchema, z.enum(["files", "changes", "development"]).transform(() => null)]);
const storedToolsSchema = z.array(storedToolSchema).transform((tools) =>
  [...new Set(tools.filter((tool) => tool !== null))]);
const viewSchema = z.object({
  activeTool: toolSchema.nullable().catch(null), terminalId: z.string().nullable().catch(null), browserTabId: z.string().nullable().catch(null),
  documentPath: z.string().nullable().catch(null),
  documentKind: z.enum(["notes", "specs"]).catch("notes"),
  libraryGrouping: z.enum(["date", "thread", "type"]).catch("date")
}).catch(defaultWorkspaceView);
/** Older saves call the work-thread choice `memberThreads`, from when only group chats had work threads. */
const withWorkThreads = (value: unknown): unknown => value && typeof value === "object" && "memberThreads" in value && !("workThreads" in value)
  ? { ...value, workThreads: value.memberThreads } : value;
const preferencesSchema = z.preprocess(withWorkThreads, z.object({
  // Mobile is a page you visit, not a place to come back to, so a saved Mobile mode opens Threads.
  sidebarMode: z.enum(["threads", "bots", "inbox", "apps"]).catch("threads"),
  activeAppId: z.string().nullable().catch(null),
  botsHome: z.enum(["bots", "routines"]).catch("bots"),
  inboxView: z.enum(["all", "needs-you", "updates", "snoozed"]).catch("all"),
  pinnedWorkspaceIds: z.array(z.string()),
  toolPins: z.record(z.string(), storedToolsSchema),
  threadGrouping: z.enum(["none", "workspace", "activity", "source", "provider"]).catch("none"),
  workThreads: z.enum(["visible", "hidden"]).catch(DEFAULT_WORK_THREAD_VISIBILITY),
  threadSourceFilter: threadSourceFilterSchema.catch("all"),
  threadSort: threadSortSchema.catch("recent"),
  workspaceAvatarColors: z.record(z.string(), z.enum(workspaceAvatarColors.map((color) => color.id))).catch({}),
  workspaceViews: z.record(z.string(), viewSchema).catch({})
}));
function defaultSidebarPreferences(): SidebarPreferences {
  return { sidebarMode: "threads", activeAppId: null, botsHome: "bots", inboxView: "all", pinnedWorkspaceIds: [], toolPins: {}, threadGrouping: "none", workThreads: DEFAULT_WORK_THREAD_VISIBILITY, threadSourceFilter: "all", threadSort: "recent", workspaceAvatarColors: {}, workspaceViews: {} };
}
export function parseSidebarPreferences(raw: string | null): SidebarPreferences {
  if (!raw) return defaultSidebarPreferences();
  try { return preferencesSchema.parse(JSON.parse(raw)); }
  catch { return defaultSidebarPreferences(); }
}
