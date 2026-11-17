import type { RuntimeInfo } from "@shared/types/remote-access/runtimeApi.types";
import type { RealtimeConnection } from "@/types/realtime.types";
import type { RuntimeSession, RuntimeSessionDeps, RuntimeSessionSnapshot, SessionEventsListener, SessionResetListener } from "@/types/runtimeSession.types";
import { RemoteRequestError, errorMessage } from "@/api/http/remoteRequestError";
import { capabilityGate, evaluateCompatibility } from "@/state/runtimeCompatibility";

const replayUnavailable = (): RemoteRequestError =>
  new RemoteRequestError("runtime", { kind: "api", status: 410, code: "cursor-unavailable", message: "Event replay is not supported by this runtime." });

/**
 * Owns the connection to one runtime: loads `/v1/runtime/info` (the capability handshake), then keeps a realtime stream
 * open when the runtime supports it and fans events out to the screens that show this runtime.
 */
export function createRuntimeSession(deps: RuntimeSessionDeps): RuntimeSession {
  let snapshot: RuntimeSessionSnapshot = { info: { status: "loading" }, compatibility: null, connection: { kind: "idle" }, liveUpdates: false };
  const listeners = new Set<() => void>();
  const eventListeners = new Set<SessionEventsListener>();
  const resetListeners = new Set<SessionResetListener>();
  let connection: RealtimeConnection | null = null;
  let started = false;
  let disposed = false;
  let loadToken = 0;

  const update = (patch: Partial<RuntimeSessionSnapshot>): void => {
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  };

  const loadInfo = async (): Promise<RuntimeInfo> => {
    const info = await deps.client.info();
    deps.onConnected(deps.now());
    return info;
  };

  const reloadAll = async (): Promise<number> => {
    const info = await loadInfo();
    update({ info: { status: "ready", value: info, refreshing: false } });
    await Promise.all([...resetListeners].map((listener) => listener()));
    return info.cursor;
  };

  const connect = async (): Promise<void> => {
    const token = ++loadToken;
    const previous = snapshot.info;
    const stale = previous.status === "ready" ? previous.value : previous.status === "error" ? previous.stale : null;
    update({ info: stale ? { status: "ready", value: stale, refreshing: true } : { status: "loading" } });
    let info: RuntimeInfo;
    try {
      info = await loadInfo();
    } catch (error) {
      if (token === loadToken && !disposed) update({ info: { status: "error", message: errorMessage(error), stale } });
      return;
    }
    if (token !== loadToken || disposed) return;
    const compatibility = evaluateCompatibility(info);
    const liveUpdates = compatibility.compatible && capabilityGate(info, "realtime").enabled;
    update({ info: { status: "ready", value: info, refreshing: false }, compatibility, liveUpdates });
    connection?.stop();
    connection = null;
    if (!liveUpdates) return;
    const replay = capabilityGate(info, "events.replay").enabled;
    connection = deps.createConnection({
      requestTicket: () => deps.client.realtimeTicket(),
      fetchEvents: (after, limit) => replay ? deps.client.events({ after, limit }) : Promise.reject(replayUnavailable()),
      socketUrl: (ticket) => deps.client.realtimeUrl(ticket)
    }, {
      onEvents: (events) => {
        for (const listener of eventListeners) listener(events);
      },
      onStatus: (status) => {
        if (status.kind === "live") deps.onConnected(deps.now());
        update({ connection: status });
      },
      onReset: reloadAll
    });
    connection.start(info.cursor);
  };

  return {
    runtimeId: deps.runtimeId,
    hostname: deps.hostname,
    client: deps.client,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    onEvents(listener) {
      eventListeners.add(listener);
      return () => {
        eventListeners.delete(listener);
      };
    },
    onReset(listener) {
      resetListeners.add(listener);
      return () => {
        resetListeners.delete(listener);
      };
    },
    start() {
      if (started || disposed) return;
      started = true;
      void connect();
    },
    retry() {
      if (disposed) return;
      started = true;
      void connect();
    },
    resume() {
      if (disposed || !started) return;
      if (snapshot.info.status === "error") void connect();
      else connection?.resume();
    },
    dispose() {
      disposed = true;
      loadToken += 1;
      connection?.stop();
      connection = null;
      listeners.clear();
      eventListeners.clear();
      resetListeners.clear();
    }
  };
}
