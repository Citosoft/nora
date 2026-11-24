import type { AnalyticsEnvironment, PostHogConfig } from "@shared/types/analytics.types";

export interface LaunchContext {
  appVersion: string;
  environment: AnalyticsEnvironment;
  platform: string;
  countryCode: string | null;
}

export interface InstallationState {
  installationId: string;
  reported: boolean;
}

export interface LaunchTrackingInput {
  allowed: boolean;
  config: PostHogConfig;
  statePath: string;
  context: LaunchContext;
  fetch?: typeof globalThis.fetch;
}
