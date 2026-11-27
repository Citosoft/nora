import os from "node:os";
import path from "node:path";
import { app } from "electron";
import type { AnalyticsService, DesktopAnalyticsOptions } from "@main/types/analytics/analytics.types";
import { readAnalyticsConfig } from "./config";
import { createAnalyticsService } from "./service";

/** Builds the analytics service from Electron's view of this run. Call after `app` is ready so the locale is known. */
export function createDesktopAnalytics(options: DesktopAnalyticsOptions): AnalyticsService {
  return createAnalyticsService({
    config: readAnalyticsConfig(path.join(options.distDirectory, "..", "runtime", "analytics-config.json")),
    statePath: path.join(app.getPath("userData"), "analytics-installation.json"),
    context: {
      appVersion: app.getVersion(),
      // Only an installed, packaged build counts as production; dev-watch and unpackaged runs are development.
      environment: options.isDevelopmentMode || !app.isPackaged ? "development" : "production",
      platform: process.platform,
      arch: process.arch,
      // The OS major version is enough to spot platform-specific problems.
      osVersion: os.release().split(".")[0] ?? "unknown",
      // The region setting, not a location: Nora never asks PostHog to geolocate the IP address.
      countryCode: app.getLocaleCountryCode() || null,
      locale: app.getLocale() || null
    },
    runtimeAllowed: options.runtimeAllowed,
    readSettings: options.readSettings,
    log: (message) => console.warn(`[analytics] ${message}`)
  });
}
