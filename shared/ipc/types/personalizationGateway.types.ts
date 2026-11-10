import type { z } from "zod";
import type { nativeBootSchema, nativeProviderSchema, personalizationRequestSchema, personalizationReplySchema } from "@shared/personalization/gateway";

export type NativeBoot = z.infer<typeof nativeBootSchema>;
export type NativeProvider = z.infer<typeof nativeProviderSchema>;
export type PersonalizationRequest = z.infer<typeof personalizationRequestSchema>;
export type PersonalizationReply = z.infer<typeof personalizationReplySchema>;
export interface PersonalizationBridge { request(input: PersonalizationRequest): Promise<NativeBoot>; }
