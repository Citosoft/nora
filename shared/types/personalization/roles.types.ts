import type { z } from "zod";
import type { roleSelectionSchema, roleSnapshotSchema, personalizationSchema } from "@shared/personalization/contracts";

export type RoleSelection = z.infer<typeof roleSelectionSchema>;
export type RoleSnapshot = z.infer<typeof roleSnapshotSchema>;
export type Personalization = z.infer<typeof personalizationSchema>;
export type RoleId = RoleSelection["id"];
export type RoleTool = "files" | "changes" | "terminal" | "browser" | "notes" | "tasks" | "workflows" | "editor" | "previews";
export interface RoleProfile {
  id: RoleId;
  label: string;
  tools: readonly RoleTool[];
  starters: readonly string[];
  guidance: string;
}
