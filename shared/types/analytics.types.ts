export type AnalyticsEnvironment = "production" | "development";
export type AnalyticsConsentStatus = "unknown" | "granted" | "declined";

export interface AnalyticsContext {
  environment: AnalyticsEnvironment;
  platform: string;
  appVersion: string;
}

export interface AnalyticsCoarseLaunchContext {
  appVersion: string;
  environment: AnalyticsEnvironment;
  platform: string;
  architecture: string;
  countryCode: string | null;
  language: string | null;
  timezoneOffsetMinutes: number;
}

export interface PostHogConfig {
  apiKey: string;
  host?: string;
}

export interface AnalyticsRuntimeConfig {
  isDevelopmentMode: boolean;
  devModeAnalyticsSwitch: string;
  devModeAnalyticsEnabled: boolean;
  analyticsAllowedInCurrentRun: boolean;
  coarseLaunchContext: AnalyticsCoarseLaunchContext;
}
