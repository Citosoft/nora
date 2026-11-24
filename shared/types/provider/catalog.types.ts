import type { z } from "zod";
import type { catalogResultSchema, catalogSchema, modelSchema, permissionPostureSchema, policySchema } from "@shared/conversations/catalog";

export type ProviderModel = z.infer<typeof modelSchema>;
export type PermissionPosture = z.infer<typeof permissionPostureSchema>;
export type ProviderPolicy = z.infer<typeof policySchema>;
export type ProviderCatalog = z.infer<typeof catalogSchema>;
export type ProviderCatalogResult = z.infer<typeof catalogResultSchema>;
