import type { z } from "zod";
import type { threadModelDefaultSchema } from "@shared/personalization/contracts";

export type ThreadModelDefault = z.infer<typeof threadModelDefaultSchema>;
