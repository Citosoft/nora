import type { z } from "zod";
import type { ACP_PROVIDER_KINDS, NATIVE_PROVIDER_KINDS, providerKindSchema } from "@shared/providers/providerKinds";

export type ProviderKind = z.infer<typeof providerKindSchema>;
export type NativeProviderKind = (typeof NATIVE_PROVIDER_KINDS)[number];
export type AcpProviderKind = (typeof ACP_PROVIDER_KINDS)[number];
