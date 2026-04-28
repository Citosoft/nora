import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { AnalyticsConsentStatus } from "@shared/appTypes";
import posthog from "posthog-js";

type EventProperties = Record<string, unknown>;

const posthogToken =
  __NORA_POSTHOG_API_KEY__?.trim() ||
  __VITE_PUBLIC_POSTHOG_PROJECT_TOKEN__?.trim() ||
  "";
const posthogHost =
  __NORA_POSTHOG_HOST__?.trim() ||
  __VITE_PUBLIC_POSTHOG_HOST__?.trim() ||
  "https://app.posthog.com";

let runtimeAllowsAnalytics = __NORA_IS_PRODUCTION__;
let analyticsConsentStatus: AnalyticsConsentStatus = "unknown";
let posthogInitialized = false;

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

function ensurePosthogInitialized(): void {
  if (posthogInitialized || !hasPostHogConfig()) {
    return;
  }

  posthog.init(posthogToken, {
    api_host: posthogHost,
    capture_pageview: false,
    disable_session_recording: true
  });
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

  if (isTrackingEnabled()) {
    posthog.opt_in_capturing();
    logToMain("debug", "Analytics tracking enabled");
    return;
  }

  posthog.opt_out_capturing();
  logToMain("debug", "Analytics tracking disabled");
}

export function setAnalyticsRuntimeAllowed(allowed: boolean): void {
  runtimeAllowsAnalytics = allowed;
  applyAnalyticsTrackingState();
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

  try {
    posthog.capture(name, properties);
  } catch (error) {
    console.error("[analytics] capture failed", name, error);
    logToMain("error", `capture failed ${name}: ${error}`);
  }
}
