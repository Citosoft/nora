/**
 * Remote access constants shared by the desktop runtime, the hosted control-plane Worker and the web/mobile app.
 * Keep this file free of Node and Electron imports.
 */
export const REMOTE_API_VERSION = 1;
export const DEFAULT_CONTROL_PLANE_URL = "https://remote-api.withnora.run";
export const REMOTE_WEB_APP_ORIGIN = "https://app.withnora.run";
export const RUNTIME_HOSTNAME_SUFFIX = "remote.withnora.run";

/**
 * Native apps name the device they run on in this request header so the desktop can list it. Browsers do not send it
 * (it would need a CORS preflight older desktops reject); the desktop describes them from their User-Agent instead.
 */
export const REMOTE_CLIENT_HEADER = "X-Nora-Client";
export const REMOTE_CLIENT_LABEL_MAX = 48;

export const REMOTE_LIMITS = Object.freeze({
  /** Conservative per-account runtime quota enforced by the Worker. */
  maxRuntimesPerUser: 3,
  runtimeNameMaxLength: 64,
  /** Largest JSON request body the runtime API accepts. */
  maxBodyBytes: 256 * 1024,
  realtimeTicketTtlMs: 30_000,
  /** A realtime socket must present a fresh ticket before this deadline or it is closed with `authExpired`. */
  realtimeAuthDeadlineMs: 5 * 60_000,
  maxRealtimeSockets: 16,
  eventPageLimit: 200,
  timelinePageLimit: 200
});

export const REALTIME_CLOSE_CODES = Object.freeze({
  /** The socket's authentication was not refreshed in time; fetch a new ticket and reconnect. */
  authExpired: 4401,
  /** The ticket or origin was rejected. */
  forbidden: 4403,
  /** The runtime has too many open sockets. */
  overloaded: 4429,
  /** Remote access was disabled or the runtime is shutting down. */
  unavailable: 4503
});
