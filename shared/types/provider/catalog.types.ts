import type { z } from "zod";
import type { catalogResultSchema, catalogSchema, modelSchema, policySchema } from "@shared/conversations/catalog";

export type ProviderModel = z.infer<typeof modelSchema>;
export type ProviderPolicy = z.infer<typeof policySchema>;
export type ProviderCatalog = z.infer<typeof catalogSchema>;
export type ProviderCatalogResult = z.infer<typeof catalogResultSchema>;
