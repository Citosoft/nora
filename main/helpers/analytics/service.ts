import { randomUUID } from "node:crypto";
import { rendererAnalyticsEventSchema } from "@shared/analytics/events";
import type { AnalyticsErrorSource, AnalyticsLevel } from "@shared/types/analytics.types";
import type { AnalyticsService, AnalyticsServiceDeps, InstallationIdentity } from "@main/types/analytics/analytics.types";
import { createFeatureUsage } from "./featureUsage";
import { loadInstallationIdentity, markInstallationReported } from "./installation";
import { buildAnalyticsInventory } from "./inventory";
import { resolveAnalyticsLevel, usageStatisticsRequireConsent } from "./policy";
import { createAnalyticsRecorder } from "./recorder";
import { createRunAnalytics } from "./runAnalytics";
import { settingsChangeEvents } from "./settingsChanges";
import { createPostHogTransport } from "./transport";

const REPORT_INTERVAL_MS = 15 * 60_000;
const INVENTORY_DELAY_MS = 60_000;
const INVENTORY_INTERVAL_MS = 24 * 60 * 60_000;
const SHUTDOWN_FLUSH_TIMEOUT_MS = 3_000;

/**
 * Composes Nora's analytics: the consent policy, the installation ID, the event recorder and every observer. Nothing is
 * read from or written to disk, and nothing is sent, while the level is `off`, so a region that needs consent gets no
 * installation ID until the user opts in.
 */
export function createAnalyticsService(deps: AnalyticsServiceDeps): AnalyticsService {
  const configured = Boolean(deps.config.apiKey.trim());
  const consentRequired = usageStatisticsRequireConsent(deps.context.countryCode);
  const startedAt = Date.now();
  const level = (): AnalyticsLevel => {
    const settings = deps.readSettings();
    return resolveAnalyticsLevel({
      runtimeAllowed: deps.runtimeAllowed, configured, consentRequired,
      usageStatisticsEnabled: settings.usageStatisticsEnabled, consentStatus: settings.analyticsConsentStatus
    });
  };
  let identity: InstallationIdentity | null = null;
  let identityLoad: Promise<InstallationIdentity | null> | null = null;
  const ensureIdentity = (): Promise<InstallationIdentity | null> => {
    if (identity || level() === "off") return Promise.resolve(identity);
    identityLoad ??= loadInstallationIdentity(deps.statePath)
      .then((loaded) => { identity = loaded; return loaded; })
      .catch((error: unknown) => { deps.log(`Analytics installation ID unavailable: ${String(error)}`); return null; })
      .finally(() => { identityLoad = null; });
    return identityLoad;
  };

  const recorder = createAnalyticsRecorder({
    transport: createPostHogTransport({ config: deps.config, fetch: deps.fetch }),
    context: deps.context, getLevel: level, getInstallation: () => identity, sessionId: randomUUID()
  });
  const featureUsage = createFeatureUsage(recorder.record);
  const timers: NodeJS.Timeout[] = [];
  const every = (ms: number, run: () => void): void => { const timer = setInterval(run, ms); timer.unref(); timers.push(timer); };

  const reportLaunch = async (): Promise<void> => {
    const loaded = await ensureIdentity();
    if (!loaded) return;
    recorder.record({ name: "app.launched", properties: { isFirstLaunch: loaded.isFirstLaunch } });
    // Send launches straight away so a crash cannot lose them; a first launch only counts once it has reached PostHog.
    const delivered = await recorder.flush();
    if (loaded.isFirstLaunch && delivered) {
      await markInstallationReported(deps.statePath, loaded);
      identity = { ...loaded, isFirstLaunch: false };
    }
  };

  const recordError = (source: AnalyticsErrorSource, error: unknown, context: string | null): void => {
    recorder.record({
      name: "error.occurred",
      properties: {
        source, errorName: error instanceof Error ? error.name || "Error" : typeof error, errorCode: null, context,
        ...(error instanceof Error ? { message: error.message, ...(error.stack ? { stack: error.stack } : {}) } : {})
      }
    });
  };

  return {
    runtimeConfig: { usageStatisticsRequireConsent: consentRequired },
    instrumentIpc: featureUsage.instrument,
    async start() {
      if (!configured || !deps.runtimeAllowed) return;
      every(REPORT_INTERVAL_MS, () => { featureUsage.report(); void recorder.flush(); });
      await reportLaunch();
    },
    async settingsSaved(previous, next) {
      recorder.levelChanged();
      const wasOff = resolveAnalyticsLevel({ runtimeAllowed: deps.runtimeAllowed, configured, consentRequired,
        usageStatisticsEnabled: previous.usageStatisticsEnabled, consentStatus: previous.analyticsConsentStatus }) === "off";
      if (wasOff && level() !== "off") await reportLaunch();
      for (const event of settingsChangeEvents(previous, next)) recorder.record(event);
    },
    observeRuns(host) {
      const runs = createRunAnalytics({ record: recorder.record, conversation: (id) => host.header(id)?.conversation ?? null });
      return host.subscribe({ after: host.eventCursor(), onEvent: runs.onEvent, onError: (error) => recordError("main", error, "run-analytics") });
    },
    reportInventory(read) {
      const report = (): void => {
        if (level() === "off") return;
        try { recorder.record({ name: "inventory.reported", properties: buildAnalyticsInventory(read()) }); }
        catch (error) { recordError("main", error, "inventory"); }
      };
      const first = setTimeout(report, INVENTORY_DELAY_MS);
      first.unref();
      timers.push(first);
      every(INVENTORY_INTERVAL_MS, report);
    },
    recordError,
    recordFromRenderer(input) {
      const parsed = rendererAnalyticsEventSchema.safeParse(input);
      if (parsed.success) recorder.record(parsed.data);
    },
    async shutdown() {
      for (const timer of timers) clearTimeout(timer);
      featureUsage.report();
      recorder.record({ name: "app.session_ended", properties: { durationSeconds: Math.round((Date.now() - startedAt) / 1000) } });
      await Promise.race([recorder.flush(), new Promise((resolve) => setTimeout(resolve, SHUTDOWN_FLUSH_TIMEOUT_MS))]);
    }
  };
}
