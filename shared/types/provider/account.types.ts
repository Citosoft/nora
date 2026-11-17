import type { z } from "zod";
import type { providerAccountActionSchema, providerAccountRequestSchema, providerAccountResultSchema, providerAccountSchema } from "@shared/providers/account";

export type ProviderAccountAction = z.infer<typeof providerAccountActionSchema>;
export type ProviderAccountRequest = z.infer<typeof providerAccountRequestSchema>;
export type ProviderAccount = z.infer<typeof providerAccountSchema>;
export type ProviderAccountResult = z.infer<typeof providerAccountResultSchema>;
