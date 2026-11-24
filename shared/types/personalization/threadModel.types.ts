import type { z } from "zod";
import type { threadModelDefaultSchema, threadModelTargetSchema } from "@shared/personalization/contracts";

export type ThreadModelDefault = z.infer<typeof threadModelDefaultSchema>;
export type ThreadModelTarget = z.infer<typeof threadModelTargetSchema>;
