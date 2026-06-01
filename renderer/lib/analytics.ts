import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { EventProperties } from "@/lib/types/analytics.types";
import type { AnalyticsCoarseLaunchContext, AnalyticsConsentStatus } from "@shared/appTypes";
import posthog from "posthog-js";

const posthogToken =
  __NORA_POSTHOG_API_KEY__?.trim() ||
  __VITE_PUBLIC_POSTHOG_PROJECT_TOKEN__?.trim() ||
  "";
const posthogHost =
  __NORA_POSTHOG_HOST__?.trim() ||
  __VITE_PUBLIC_POSTHOG_HOST__?.trim() ||
  "https://app.posthog.com";

let runtimeAllowsAnalytics = __NORA_IS_PRODUCTION__;
let coarseLaunchContext: AnalyticsCoarseLaunchContext = {
  appVersion: __NPM_PACKAGE_VERSION__ ?? "0.0.0",
  environment: __NORA_IS_PRODUCTION__ ? "production" : "development",
  platform: navigator.platform,
  architecture: "unknown",
  countryCode: null,
  language: navigator.language.split("-")[0] || null,
  timezoneOffsetMinutes: new Date().getTimezoneOffset()
};
let analyticsConsentStatus: AnalyticsConsentStatus = "unknown";
let posthogInitialized = false;
let appLaunchEventTracked = false;

function logToMain(level: "debug" | "info" | "warn" | "error", message: string): void {
  if (typeof window === "undefined") {
    return;
  }

  noraSystemClient.logAnalytics(level, message).catch(() => {
    /* best effort */
  });
}

function hasPostHogConfig(): boolean {
  return Boolean(posthogToken);
}

function isConsentGranted(): boolean {
  return analyticsConsentStatus === "granted";
}

function isTrackingEnabled(): boolean {
  return hasPostHogConfig() && runtimeAllowsAnalytics && isConsentGranted();
}

function isCoarseLaunchTrackingEnabled(): boolean {
  return hasPostHogConfig() && runtimeAllowsAnalytics;
}

function ensurePosthogInitialized(): void {
  if (posthogInitialized || !hasPostHogConfig()) {
    return;
  }

  posthog.init(posthogToken, {
    api_host: posthogHost,
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true
  });
  posthog.clear_opt_in_out_capturing();
  posthogInitialized = true;
  logToMain("info", `PostHog initialized (host=${posthogHost})`);
}

function applyAnalyticsTrackingState(): void {
  if (!hasPostHogConfig()) {
    logToMain("debug", "PostHog unavailable: missing API key");
    return;
  }

  ensurePosthogInitialized();
  if (!posthogInitialized) {
    return;
  }

  logToMain("debug", isTrackingEnabled() ? "Detailed analytics tracking enabled" : "Detailed analytics tracking disabled");
}

export function setAnalyticsRuntimeAllowed(allowed: boolean): void {
  runtimeAllowsAnalytics = allowed;
  applyAnalyticsTrackingState();
}

export function setAnalyticsCoarseLaunchContext(context: AnalyticsCoarseLaunchContext): void {
  coarseLaunchContext = context;
}

export function setAnalyticsConsentStatus(status: AnalyticsConsentStatus): void {
  analyticsConsentStatus = status;
  applyAnalyticsTrackingState();
}

export function trackAnalyticsEvent(name: string, properties?: EventProperties): void {
  if (!isTrackingEnabled()) {
    logToMain("debug", `Analytics disabled, skipping ${name}`);
    return;
  }

  capturePostHogEvent(name, properties);
}

export function trackAppLaunchEvent(): void {
  if (appLaunchEventTracked) {
    return;
  }

  if (!isCoarseLaunchTrackingEnabled()) {
    logToMain("debug", "Analytics unavailable, skipping app.launched");
    return;
  }

  appLaunchEventTracked = true;
  capturePostHogEvent("app.launched", toEventProperties(coarseLaunchContext));
}

function toEventProperties(context: AnalyticsCoarseLaunchContext): EventProperties {
  return {
    appVersion: context.appVersion,
    environment: context.environment,
    platform: context.platform,
    architecture: context.architecture,
    countryCode: context.countryCode,
    language: context.language,
    timezoneOffsetMinutes: context.timezoneOffsetMinutes
  };
}

function capturePostHogEvent(name: string, properties?: EventProperties): void {
  ensurePosthogInitialized();
  if (!posthogInitialized) {
    return;
  }

  try {
    posthog.capture(name, properties);
  } catch (error) {
    console.error("[analytics] capture failed", name, error);
    logToMain("error", `capture failed ${name}: ${error}`);
  }
}
