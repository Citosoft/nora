import type { z } from "zod";
import type { botAvatarSchema } from "@shared/bots/contracts";

export type BotAvatarSpec = z.infer<typeof botAvatarSchema>;
