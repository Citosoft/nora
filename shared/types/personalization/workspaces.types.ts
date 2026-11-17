import type { z } from "zod";
import type { nativeWorkspaceSchema } from "@shared/personalization/workspaces";

export type NativeWorkspace = z.infer<typeof nativeWorkspaceSchema>;
