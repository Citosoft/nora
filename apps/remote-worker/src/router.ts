import { PUSH_ROUTES } from "@shared/remote-access/push";
import type { RouteMatch } from "./types/router.types";

const RUNTIMES_PREFIX = "/v1/runtimes";

/** Pure path/method matching. Path IDs are returned raw; validation happens after authentication. */
export function matchRoute(method: string, pathname: string): RouteMatch {
  if (pathname === PUSH_ROUTES.send || pathname === PUSH_ROUTES.devices || pathname.startsWith(`${PUSH_ROUTES.devices}/`)) {
    return matchPushRoute(method, pathname);
  }
  return matchRuntimeRoute(method, pathname);
}

function matchPushRoute(method: string, pathname: string): RouteMatch {
  if (pathname === PUSH_ROUTES.send) return method === "POST" ? matched({ kind: "push-send" }) : notAllowed(["POST"]);
  if (pathname === PUSH_ROUTES.devices) return method === "POST" ? matched({ kind: "push-register" }) : notAllowed(["POST"]);
  const rawDeviceId = pathname.slice(PUSH_ROUTES.devices.length + 1);
  if (rawDeviceId.length === 0 || rawDeviceId.includes("/")) return { kind: "not-found" };
  return method === "DELETE" ? matched({ kind: "push-unregister", rawDeviceId }) : notAllowed(["DELETE"]);
}

function matchRuntimeRoute(method: string, pathname: string): RouteMatch {
  if (pathname === `${RUNTIMES_PREFIX}/provision`) {
    return method === "POST" ? matched({ kind: "provision" }) : notAllowed(["POST"]);
  }
  if (pathname === RUNTIMES_PREFIX) {
    return method === "GET" ? matched({ kind: "list" }) : notAllowed(["GET"]);
  }
  if (!pathname.startsWith(`${RUNTIMES_PREFIX}/`)) return { kind: "not-found" };

  const segments = pathname.slice(RUNTIMES_PREFIX.length + 1).split("/");
  const [rawInstallationId, action, ...rest] = segments;
  if (rawInstallationId === undefined || rawInstallationId.length === 0 || rest.length > 0) return { kind: "not-found" };

  if (action === undefined) {
    if (method === "PATCH") return matched({ kind: "rename", rawInstallationId });
    if (method === "DELETE") return matched({ kind: "delete", rawInstallationId });
    return notAllowed(["PATCH", "DELETE"]);
  }
  if (action === "rotate") {
    return method === "POST" ? matched({ kind: "rotate", rawInstallationId }) : notAllowed(["POST"]);
  }
  return { kind: "not-found" };
}

function matched(route: Extract<RouteMatch, { kind: "matched" }>["route"]): RouteMatch {
  return { kind: "matched", route };
}

function notAllowed(allow: readonly string[]): RouteMatch {
  return { kind: "method-not-allowed", allow };
}
