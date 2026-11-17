import { DEFAULT_CONTROL_PLANE_URL } from "@shared/remote-access/constants";
import type { AppConfig } from "@/types/appConfig.types";

/** Expo inlines `EXPO_PUBLIC_*` only for literal `process.env.NAME` reads, so each variable is read by name here. */
export function readAppConfig(): AppConfig {
  return {
    clerkPublishableKey: nonEmpty(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY),
    controlPlaneUrl: normalizeBaseUrl(nonEmpty(process.env.EXPO_PUBLIC_REMOTE_API_URL) ?? DEFAULT_CONTROL_PLANE_URL)
  };
}

export const appConfig: AppConfig = readAppConfig();

function nonEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}
