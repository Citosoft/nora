import { appearanceSchema } from "@shared/settings-sync/contracts";
import { applicableSettings } from "@shared/settings-sync/entries";
import type { PortableAppearance, SettingsSyncState } from "@shared/types/settings-sync/sync.types";
import type { SettingsSyncService, SyncServiceOptions, SyncStore } from "@main/types/settings-sync/service.types";
import { captureSettings, applySettings } from "./preferences";
import { syncSettings } from "./engine";
import { createSyncPersistence } from "./store";

/** Owns opt-in, offline journals, account isolation, retries and application of portable settings. */
export function createSettingsSyncService(options: SyncServiceOptions): SettingsSyncService {
  const persistence = createSyncPersistence(options.path);
  let store: SyncStore | null = null;
  let appearance: PortableAppearance | null = null;
  let phase: SettingsSyncState["phase"] = "signed-out";
  let message: string | null = null;
  let accountId: string | null = null;
  let controller: AbortController | null = null;
  let job: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const journal = () => accountId && store && Object.hasOwn(store.accounts, accountId) ? store.accounts[accountId] : undefined;
  const hasLocalChanges = (): boolean => !!appearance && !!journal() && JSON.stringify(journal()?.baseline) !== JSON.stringify(captureSettings(options.readSettings(), appearance));
  const state = (): SettingsSyncState => ({ enabled: journal()?.enabled ?? false,
    phase: !options.session() ? "signed-out" : message ? "error" : !journal()?.enabled ? "off" : phase,
    lastSyncedAt: journal()?.lastSyncedAt ?? null, message });
  const notify = (): void => options.notify(state());
  const persist = async (): Promise<void> => { if (store) await persistence.save(store); };
  const adoptAccount = async (): Promise<void> => {
    if (!store || !accountId || !appearance) return;
    const current = journal();
    if (current && store.lastUserId !== accountId) {
      current.baseline = captureSettings(options.readSettings(), appearance); current.initialized = false; current.seedLocal = false;
    }
    store.lastUserId = accountId;
    await persist();
  };
  const schedule = (delay: number): void => {
    clearTimeout(timer);
    if (!disposed && journal()?.enabled && appearance) timer = setTimeout(() => { void run(); }, delay);
  };
  const run = async (): Promise<void> => {
    if (job) return job;
    const session = options.session(); const current = journal(); const saved = store;
    if (disposed || !session || !current?.enabled || !appearance || !saved) return;
    controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]);
    phase = "syncing"; message = null; notify();
    job = syncSettings({ client: options.client, journal: current, deviceId: saved.deviceId, session, signal, now: Date.now,
      readLocal: () => captureSettings(options.readSettings(), appearance ?? current.baseline), persist,
      async apply(values, expected) {
        signal.throwIfAborted();
        const next = await options.updateSettings((settings) => {
          signal.throwIfAborted();
          return applySettings(settings, appearance ?? expected, values, expected, options.providers());
        });
        signal.throwIfAborted();
        const accepted = applicableSettings(captureSettings(next, appearance ?? expected), values, expected);
        appearance = appearanceSchema.parse({ ...appearance, ...appearanceSchema.partial().strip().parse(accepted) });
        options.onSettingsApplied();
        options.applied({ values, expected });
        return captureSettings(next, appearance);
      }
    }).then(() => { phase = Object.keys(current.pending).length || hasLocalChanges() ? "pending" : "idle"; }).catch((error: unknown) => {
      if (!controller?.signal.aborted) { phase = "error"; message = error instanceof Error ? error.message : "Settings could not sync. Local changes are kept for retry."; }
    }).finally(() => { job = null; controller = null; notify(); schedule(options.session()?.userId !== session.userId ? 0 : phase === "pending" ? 750 : 60_000); });
    return job;
  };
  return {
    async initialize() {
      try { store = await persistence.read(); } catch (error) { message = error instanceof Error ? error.message : "Sync state is unavailable."; }
      notify();
    },
    sessionChanged() {
      controller?.abort(); clearTimeout(timer);
      const session = options.session(); accountId = session?.userId ?? null;
      if (store && session) void adoptAccount().catch(() => { message = "Sync preferences could not be saved."; notify(); });
      phase = "idle"; if (store) message = null; notify(); schedule(0);
    },
    localChanged() { if (journal()?.enabled && hasLocalChanges()) { if (!job) { phase = "pending"; notify(); } schedule(750); } },
    async request(input) {
      if (input.kind === "appearance") { appearance = input.appearance; await adoptAccount(); schedule(750); }
      if (input.kind === "set-enabled") {
        if (!store || !appearance || !accountId || !options.session()) throw new Error("Sign in and wait for settings to finish loading before enabling sync.");
        const current = journal() ?? { enabled: false, initialized: false, seedLocal: true, clock: 0,
          baseline: captureSettings(options.readSettings(), appearance), pending: {}, lastSyncedAt: null };
        current.enabled = input.enabled; store.accounts = { ...store.accounts, [accountId]: current };
        if (!input.enabled) { controller?.abort(); clearTimeout(timer); }
        await persist(); message = null; notify(); if (input.enabled) schedule(0);
      }
      if (input.kind === "sync") await run();
      return state();
    },
    async dispose() { disposed = true; clearTimeout(timer); controller?.abort(); await job; await persistence.flush().catch(() => undefined); }
  };
}
