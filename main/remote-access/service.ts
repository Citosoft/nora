import { isNodeError } from "@main/nodeErrors";
import type { AccountSession } from "@main/types/account/session.types";
import { runtimeNameSchema } from "@shared/remote-access/directory";
import { NORA_RELAY_NAME, RELAY_RETENTION, REMOTE_WEB_APP_ORIGIN } from "@shared/remote-access/constants";
import type { RemoteAccessStatus, RemoteAccessView } from "@shared/types/remote-access/remoteAccess.types";
import type { RemoteAccessService } from "@main/types/remote-access/service.types";
import type { RemoteCoordinatorOptions } from "@main/types/remote-access/coordinator.types";
import type { RemoteState } from "@main/types/remote-access/store.types";
import type { RemoteIdentity } from "@main/types/remote-access/auth.types";
import type { RuntimeServer } from "@main/types/remote-access/http/runtime.types";
import type { ConnectorHandle } from "@main/types/remote-access/connector/connector.types";
import { createRemotePresence } from "./presence";

/** Owns the opt-in, account binding and transport lifetime independently of Electron windows. */
export function createRemoteAccessService(options: RemoteCoordinatorOptions): RemoteAccessService {
  let state: RemoteState | null = null;
  let status: RemoteAccessStatus = { status: "disabled" };
  let queue = Promise.resolve();
  let server: RuntimeServer | null = null;
  let connector: ConnectorHandle | null = null;
  let controller = new AbortController();
  let generation = 0;
  let accepting = false;
  let disposed = false;
  let shutdownJob: Promise<void> | null = null;
  const listeners = new Set<(view: RemoteAccessView) => void>();
  const presence = createRemotePresence({ now: options.now ?? Date.now, onChanged: () => notify(), revoked: (sessionId) => state?.revokedSessions.includes(sessionId) ?? false });

  const view = (): RemoteAccessView => ({ signedIn: options.session() !== null, enabled: state?.enabled ?? false,
    status: structuredClone(status), runtime: state?.runtime ? { installationId: state.installationId, name: state.name, hostname: state.runtime.hostname } : null,
    webAppUrl: REMOTE_WEB_APP_ORIGIN, pendingCleanup: !!state?.cleanup.length, devices: presence.devices() });
  const notify = (): void => { const next = view(); options.onChanged(next); for (const listener of listeners) listener(next); };
  const invalidate = (): number => { accepting = false; controller.abort(); controller = new AbortController(); return ++generation; };
  const assertCurrent = (epoch: number, session?: AccountSession): void => {
    const current = options.session();
    if (disposed || epoch !== generation || controller.signal.aborted || (session && (current?.userId !== session.userId || current.sessionId !== session.sessionId))) {
      throw new Error(`${NORA_RELAY_NAME} changed before this operation finished.`);
    }
  };
  const loaded = (): RemoteState => { if (!state) throw new Error(`${NORA_RELAY_NAME} settings are unavailable. Retry to restore them.`); return state; };
  const save = (): Promise<void> => options.store.save(loaded());
  const stopTransport = async (): Promise<void> => {
    accepting = false;
    const previousServer = server; server = null;
    const previousConnector = connector; connector = null;
    await Promise.all([previousServer?.close(), previousConnector?.stop()]);
  };
  const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
    const job = queue.then(work); queue = job.then(() => undefined, () => undefined); return job;
  };
  const setFailure = (error: unknown, epoch: number): void => {
    if (disposed || generation !== epoch) return;
    accepting = false;
    status = { status: "error", message: error instanceof Error ? error.message : `${NORA_RELAY_NAME} could not start. Retry to reconnect.`, retryable: true };
    notify();
  };
  const cleanup = async (epoch: number): Promise<void> => {
    const local = loaded();
    const session = options.session();
    if (!session) return;
    for (const entry of [...local.cleanup]) {
      if (entry.ownerId !== session.userId) continue;
      await options.control.remove(session, entry.installationId, controller.signal);
      assertCurrent(epoch, session);
      local.cleanup = local.cleanup.filter((candidate) => candidate.ownerId !== entry.ownerId || candidate.installationId !== entry.installationId);
      await save();
    }
  };
  const cleanupWhenAvailable = async (epoch: number): Promise<void> => {
    try { await cleanup(epoch); }
    catch { assertCurrent(epoch); /* Local disable succeeds offline; preserve the record for an explicit retry. */ }
  };
  const connect = async (epoch: number, recover: boolean, rotate = false): Promise<void> => {
    await stopTransport(); assertCurrent(epoch);
    const local = loaded();
    if (!local.enabled) {
      status = { status: "disabled" };
      if (recover) await cleanup(epoch);
      else await cleanupWhenAvailable(epoch);
      notify(); return;
    }
    const session = options.session();
    if (!session || session.userId !== local.ownerId) {
      status = { status: "paused", reason: session ? "different-account" : "signed-out" }; notify(); return;
    }
    status = { status: "starting" }; notify();
    try {
      const permits = (identity: RemoteIdentity): boolean =>
        accepting && !disposed && generation === epoch && !!state?.enabled && state.ownerId === identity.userId && options.session()?.userId === identity.userId
        && !presence.revoked(identity.sessionId);
      let opened: RuntimeServer;
      try { opened = await options.startServer(local.port, permits, presence); }
      catch (error) {
        if (!local.port || !isNodeError(error) || error.code !== "EADDRINUSE") throw error;
        assertCurrent(epoch, session);
        opened = await options.startServer(null, permits, presence);
        recover = true; // The control plane must update ingress before a cached connector can use the new port.
      }
      if (generation !== epoch || disposed) { await opened.close(); assertCurrent(epoch); }
      server = opened;
      local.port = opened.port;
      await save(); assertCurrent(epoch, session);
      let token: string | null = null;
      // Old installations may have expired while this machine was away. Provision before using a cached token.
      const registrationAge = local.runtime ? (options.now ?? Date.now)() - Date.parse(local.runtime.registeredAt) : 0;
      if (registrationAge >= RELAY_RETENTION.runtimeExpiryMs) recover = true;
      if (!recover && !rotate && local.connectorSecret && local.runtime) {
        try { token = options.store.decrypt(local.connectorSecret); } catch { /* Re-provision recovers a lost OS keychain entry. */ }
      }
      if (!token) {
        const provisioned = rotate
          ? await options.control.rotate(session, local.installationId, controller.signal)
          : await options.control.provision(session, { installationId: local.installationId, name: local.name, environment: options.environment, port: opened.port }, controller.signal);
        assertCurrent(epoch, session);
        if (provisioned.runtime.installationId !== local.installationId) throw new Error("The remote service returned another installation's connection.");
        // Encrypt before mutating persisted state; an unavailable keychain must not write plaintext credentials.
        const secret = options.store.encrypt(provisioned.connectorToken);
        local.runtime = provisioned.runtime; local.connectorSecret = secret;
        token = provisioned.connectorToken;
        await save(); assertCurrent(epoch, session);
      }
      accepting = true;
      const started = await options.connector.start({ token, signal: controller.signal, onStatus(next) {
        if (!disposed && generation === epoch) { status = next; notify(); }
      } });
      if (generation !== epoch || disposed) { await started.stop(); assertCurrent(epoch); }
      connector = started;
      await cleanupWhenAvailable(epoch);
    } catch (error) {
      if (generation === epoch) await stopTransport();
      throw error;
    }
  };
  const resume = (recover: boolean, rotate = false): Promise<RemoteAccessView> => {
    const epoch = invalidate();
    return enqueue(async () => { assertCurrent(epoch); await connect(epoch, recover, rotate); return view(); })
      .catch((error: unknown) => { setFailure(error, epoch); throw error; });
  };

  return {
    async start() {
      if (disposed) return;
      const epoch = invalidate();
      await enqueue(async () => {
        try { state ??= await options.store.load(); await save(); assertCurrent(epoch); await connect(epoch, false); }
        catch (error) { setFailure(error, epoch); }
      });
    },
    enable() {
      const epoch = invalidate();
      return enqueue(async () => {
        assertCurrent(epoch);
        const local = loaded(); const session = options.session();
        if (!session) throw new Error(`Sign in to your Nora account to enable ${NORA_RELAY_NAME}.`);
        if (local.enabled && local.ownerId !== session.userId) throw new Error(`Turn off ${NORA_RELAY_NAME} for the previous account before turning it on for this account.`);
        // Remove a pending registration for this account before reusing its installation identity.
        await cleanup(epoch); assertCurrent(epoch, session);
        local.enabled = true; local.ownerId = session.userId;
        await save(); assertCurrent(epoch, session); notify();
        await connect(epoch, false); return view();
      }).catch((error: unknown) => { setFailure(error, epoch); throw error; });
    },
    disable() {
      const epoch = invalidate();
      if (state) {
        if (state.ownerId && !state.cleanup.some((entry) => entry.ownerId === state?.ownerId && entry.installationId === state.installationId)) {
          state.cleanup.push({ ownerId: state.ownerId, installationId: state.installationId });
        }
        state.enabled = false; state.ownerId = null; state.runtime = null; state.connectorSecret = null; state.port = null; state.revokedSessions = [];
      }
      status = { status: "disabled" }; presence.clear(); notify();
      // Stop immediately even while a provisioning response is still outstanding.
      const stopped = stopTransport();
      return enqueue(async () => { await stopped; assertCurrent(epoch); await save(); await cleanupWhenAvailable(epoch); notify(); return view(); });
    },
    retry() { return state ? resume(true) : this.start().then(view); },
    rotate() {
      if (!state?.enabled || options.session()?.userId !== state.ownerId) return Promise.reject(new Error("Sign in with the owning account before resetting this connection."));
      return resume(true, true);
    },
    rename(name) {
      const validated = runtimeNameSchema.parse(name);
      const epoch = generation;
      return enqueue(async () => {
        assertCurrent(epoch);
        const local = loaded(); const session = options.session();
        if (local.runtime) {
          if (!session || session.userId !== local.ownerId) throw new Error("Sign in with the owning account before renaming this runtime.");
          const renamed = await options.control.rename(session, local.installationId, validated, controller.signal);
          assertCurrent(epoch, session); local.runtime = renamed;
        }
        local.name = validated; await save(); notify(); return view();
      });
    },
    disconnectDevice(deviceId) {
      const local = loaded();
      if (!local.enabled) return Promise.reject(new Error(`${NORA_RELAY_NAME} is off, so no devices are connected.`));
      // Refuse the session and close its sockets now; persisting can wait behind any running transport work.
      if (!local.revokedSessions.includes(deviceId)) local.revokedSessions = [...local.revokedSessions, deviceId].slice(-64);
      presence.disconnect(deviceId); notify();
      return enqueue(async () => { await save(); return view(); });
    },
    view,
    isEnabled: () => state?.enabled ?? false,
    activity: options.activity,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    sessionChanged() {
      if (disposed) return;
      const epoch = invalidate();
      if (state?.enabled) { status = { status: "paused", reason: options.session() ? "different-account" : "signed-out" }; }
      presence.clear(); notify();
      const stopped = stopTransport();
      void enqueue(async () => { await stopped; assertCurrent(epoch); if (state) await connect(epoch, false); }).catch((error: unknown) => setFailure(error, epoch));
    },
    shutdown() {
      if (shutdownJob) return shutdownJob;
      disposed = true; invalidate();
      const stopped = stopTransport();
      shutdownJob = (async () => { await stopped; await queue; options.close(); listeners.clear(); })();
      return shutdownJob;
    }
  };
}
