import type { z } from "zod";
import type { idleCompactionModeSchema } from "@shared/personalization/contracts";

export type IdleCompactionMode = z.infer<typeof idleCompactionModeSchema>;
