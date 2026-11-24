import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { EventProperties } from "@/lib/types/analytics.types";
import type { AnalyticsConsentStatus } from "@shared/appTypes";
import posthog from "posthog-js";

const posthogToken =
  __NORA_POSTHOG_API_KEY__?.trim() ||
  __VITE_PUBLIC_POSTHOG_PROJECT_TOKEN__?.trim() ||
  "";
const posthogHost =
  __NORA_POSTHOG_HOST__?.trim() ||
  __VITE_PUBLIC_POSTHOG_HOST__?.trim() ||
  "https://us.i.posthog.com";

let runtimeAllowsAnalytics = false;
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
  if (posthogInitialized || !isTrackingEnabled()) {
    return;
  }

  posthog.init(posthogToken, {
    api_host: posthogHost,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_dead_clicks: false,
    capture_performance: false,
    capture_exceptions: false,
    person_profiles: "never",
    disable_persistence: true,
    disable_external_dependency_loading: true,
    advanced_disable_feature_flags: true,
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

  if (isTrackingEnabled()) {
    ensurePosthogInitialized();
    if (posthogInitialized) posthog.opt_in_capturing({ captureEventName: false });
  } else if (posthogInitialized) {
    posthog.opt_out_capturing();
  }

  logToMain("debug", isTrackingEnabled() ? "Detailed analytics tracking enabled" : "Detailed analytics tracking disabled");
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

  capturePostHogEvent(name, properties);
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
