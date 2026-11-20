import type { z } from "zod";
import type { providerConnectionSchema, providerAccountActionSchema, providerAccountRequestSchema, providerAccountResultSchema, providerAccountSchema, providerLoginMethodSchema } from "@shared/providers/account";

export type ProviderAccountAction = z.infer<typeof providerAccountActionSchema>;
export type ProviderAccountRequest = z.infer<typeof providerAccountRequestSchema>;
export type ProviderAccount = z.infer<typeof providerAccountSchema>;
export type ProviderAccountResult = z.infer<typeof providerAccountResultSchema>;
export type ProviderLoginMethod = z.infer<typeof providerLoginMethodSchema>;

export type ProviderConnectionKind = z.infer<typeof providerConnectionSchema>;
