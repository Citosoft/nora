import type { z } from "zod";
import type { desktopSessionSchema } from "@main/providers/claude/desktopSessions";

export type ClaudeDesktopSession = z.infer<typeof desktopSessionSchema>;
