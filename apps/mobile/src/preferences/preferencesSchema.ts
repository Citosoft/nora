import { z } from "zod";
import { runtimeDirectoryEntrySchema } from "@shared/remote-access/directory";

/**
 * Everything the app keeps on the device besides unsent commands: display preferences and non-sensitive runtime
 * metadata. Tokens never live here; Clerk keeps them in its own storage.
 */
export const preferencesSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).catch("system"),
  defaultRuntimeId: z.string().nullable().catch(null),
  /** Client-observed time of the last successful authenticated request, per installation ID. */
  lastConnected: z.record(z.string(), z.string().datetime()).catch({}),
  /** The last runtime list from the Worker, shown (marked as cached) when the Worker is unreachable. */
  cachedRuntimes: z.object({ userId: z.string(), savedAt: z.string().datetime(), runtimes: z.array(runtimeDirectoryEntrySchema) }).nullable().catch(null),
  installHintDismissed: z.boolean().catch(false),
  /** The welcome pages were seen once; later sign-ins open straight on the sign-in page. */
  onboardingCompleted: z.boolean().catch(false),
  /** Desktop-sized windows only: the permanent sidebar shrunk to its icon rail. */
  sidebarCollapsed: z.boolean().catch(false)
});

export const defaultPreferences = preferencesSchema.parse({});
