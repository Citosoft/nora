import { randomUUID } from "node:crypto";
import { ANALYTICS_EVENT_TIERS } from "@shared/analytics/events";
import type { AnalyticsEvent, AnalyticsLevel, AnalyticsPropertyValue } from "@shared/types/analytics.types";
import type { AnalyticsRecorder, AnalyticsRecorderDeps } from "@main/types/analytics/analytics.types";
import { levelAllows } from "./policy";
import { scrubErrorMessage, scrubStack } from "./scrub";

// Development events get their own names so they never mix into production insights, even without an environment filter.
const DEVELOPMENT_EVENT_PREFIX = "[DEV] ";

const LEVEL_RANK: Readonly<Record<AnalyticsLevel, number>> = { off: 0, anonymous: 1, detailed: 2 };

/** Error text is only sent with opt-in, and then only after scrubbing; anonymous error events keep the name and code. */
function eventProperties(event: AnalyticsEvent, level: AnalyticsLevel): Record<string, AnalyticsPropertyValue> {
  if (event.name !== "error.occurred") return { ...event.properties };
  const { message, stack, ...rest } = event.properties;
  if (level !== "detailed") return rest;
  return {
    ...rest,
    ...(message ? { message: scrubErrorMessage(message) } : {}),
    ...(stack ? { stack: scrubStack(stack) } : {})
  };
}

/**
 * The only way events leave Nora. Checks each event against the current level, adds coarse context and the random
 * installation ID, and strips IP and GeoIP so PostHog cannot locate the user.
 */
export function createAnalyticsRecorder(deps: AnalyticsRecorderDeps): AnalyticsRecorder {
  const now = deps.now ?? (() => new Date());
  const nextId = deps.nextId ?? randomUUID;
  let lastLevel = deps.getLevel();

  return {
    record(event) {
      const level = deps.getLevel();
      if (!levelAllows(level, ANALYTICS_EVENT_TIERS[event.name])) return;
      const installation = deps.getInstallation();
      if (!installation) return;
      deps.transport.enqueue({
        uuid: nextId(),
        event: deps.context.environment === "development" ? `${DEVELOPMENT_EVENT_PREFIX}${event.name}` : event.name,
        timestamp: now().toISOString(),
        properties: {
          ...eventProperties(event, level),
          distinct_id: installation.installationId,
          $session_id: deps.sessionId,
          $lib: "nora-desktop",
          $lib_version: deps.context.appVersion,
          appVersion: deps.context.appVersion,
          environment: deps.context.environment,
          platform: deps.context.platform,
          arch: deps.context.arch,
          osVersion: deps.context.osVersion,
          countryCode: deps.context.countryCode,
          locale: deps.context.locale,
          analyticsLevel: level,
          // Person profiles only exist with opt-in; anonymous events stay unlinked rows.
          $process_person_profile: level === "detailed",
          $geoip_disable: true,
          $ip: null
        }
      });
    },
    levelChanged() {
      const level = deps.getLevel();
      // Anything queued under a more permissive level must not be sent once the user narrows it.
      if (LEVEL_RANK[level] < LEVEL_RANK[lastLevel]) deps.transport.clear();
      lastLevel = level;
    },
    flush: () => deps.transport.flush()
  };
}
