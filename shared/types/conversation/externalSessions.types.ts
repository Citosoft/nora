import type { z } from "zod";
import type { externalSessionSchema, externalSessionsResultSchema } from "@shared/conversations/externalSessions";

export type ExternalSession = z.infer<typeof externalSessionSchema>;
export type ExternalSessionsResult = z.infer<typeof externalSessionsResultSchema>;
