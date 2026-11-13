import type { z } from "zod";
import type { threadReferenceSchema } from "@shared/conversations/references";

export type ThreadReference = z.infer<typeof threadReferenceSchema>;
