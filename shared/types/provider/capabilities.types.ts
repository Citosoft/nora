import type { z } from "zod";
import type { capabilitiesSchema } from "@shared/conversations/catalog";

export type ProviderCapabilities = z.infer<typeof capabilitiesSchema>;
