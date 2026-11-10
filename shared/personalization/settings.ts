import { personalizationSchema } from "./contracts";
import type { Personalization } from "@shared/types/personalization/roles.types";

export function emptyPersonalization(): Personalization { return { defaultRole: null, workspaceRoles: {} }; }

/** Settings files are an untyped boundary; old files enter onboarding without inferring a role. */
export function readPersonalization(input: unknown): Personalization {
  if (input === undefined) return emptyPersonalization();
  const parsed = personalizationSchema.safeParse(input);
  return parsed.success ? parsed.data : emptyPersonalization();
}
