import type { z } from "zod";
import type { threadPreferencesSchema, threadPreferencesPatchSchema } from "@shared/personalization/contracts";

export type ThreadPreferences = z.infer<typeof threadPreferencesSchema>;
export type ThreadPreferencesPatch = z.infer<typeof threadPreferencesPatchSchema>;
