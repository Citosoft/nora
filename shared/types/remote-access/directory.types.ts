import type { z } from "zod";
import type { directoryErrorCodeSchema, directoryErrorSchema, listRuntimesResponseSchema, provisionRuntimeRequestSchema,
  provisionRuntimeResponseSchema, renameRuntimeRequestSchema, runtimeDirectoryEntrySchema, runtimeEnvironmentSchema } from "@shared/remote-access/directory";

export type RuntimeDirectoryEntry = z.infer<typeof runtimeDirectoryEntrySchema>;
export type RuntimeEnvironment = z.infer<typeof runtimeEnvironmentSchema>;
export type ProvisionRuntimeRequest = z.infer<typeof provisionRuntimeRequestSchema>;
export type ProvisionRuntimeResponse = z.infer<typeof provisionRuntimeResponseSchema>;
export type ListRuntimesResponse = z.infer<typeof listRuntimesResponseSchema>;
export type RenameRuntimeRequest = z.infer<typeof renameRuntimeRequestSchema>;
export type DirectoryErrorCode = z.infer<typeof directoryErrorCodeSchema>;
export type DirectoryError = z.infer<typeof directoryErrorSchema>;
