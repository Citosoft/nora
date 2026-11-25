import type { z } from "zod";
import type { roleSelectionSchema, roleSnapshotSchema, personalizationSchema } from "@shared/personalization/contracts";

export type RoleSelection = z.infer<typeof roleSelectionSchema>;
export type RoleSnapshot = z.infer<typeof roleSnapshotSchema>;
export type Personalization = z.infer<typeof personalizationSchema>;
export type RoleId = RoleSelection["id"];
export interface RoleProfile {
  id: RoleId;
  label: string;
  starters: readonly string[];
  guidance: string;
}
