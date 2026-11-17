import { REMOTE_API_VERSION } from "@shared/remote-access/constants";
import { runtimeInfoSchema, runtimeApiErrorSchema, RUNTIME_ROUTES } from "@shared/remote-access/runtimeApi";
import type { RuntimeApiErrorCode } from "@shared/types/remote-access/runtimeApi.types";
import type { OfflineReason, ProbeOptions, RuntimeReachability } from "@/types/reachability.types";
import { requestJson } from "@/api/http/requestJson";
import { RemoteRequestError } from "@/api/http/remoteRequestError";
import { runtimeOrigin } from "@/api/runtime/runtimeOrigin";

/**
 * Asks the runtime itself whether it is reachable, with authenticated `GET /v1/runtime/info`. The tunnel answers with an error page when the computer is off, so only a valid reply counts as online.
 */
export async function probeRuntime(options: ProbeOptions): Promise<RuntimeReachability> {
  const checkedAt = () => options.now().toISOString();
  try {
    const info = await requestJson<{ apiVersion: number }, RuntimeApiErrorCode>({
      service: "runtime", method: "GET", url: `${runtimeOrigin(options.hostname)}${RUNTIME_ROUTES.info}`, getToken: options.getToken,
      fetch: options.fetch, timeoutMs: options.timeoutMs, schema: runtimeInfoSchema, errorSchema: runtimeApiErrorSchema
    });
    return { status: "online", apiVersion: info.apiVersion, compatible: info.apiVersion === REMOTE_API_VERSION, checkedAt: checkedAt() };
  } catch (error) {
    return { status: "offline", reason: offlineReason(error), checkedAt: checkedAt() };
  }
}

function offlineReason(error: unknown): OfflineReason {
  if (!(error instanceof RemoteRequestError)) return "unexpected-reply";
  switch (error.failure.kind) {
    case "timeout": return "timeout";
    case "network": return "unreachable";
    case "api": return ["unavailable", "unauthenticated", "forbidden"].includes(error.failure.code) ? "unavailable" : "unexpected-reply";
    case "http": return error.failure.status >= 500 ? "unreachable" : "unexpected-reply";
    case "signed-out": return "unavailable";
    case "invalid-response": return "unexpected-reply";
  }
}

export function describeReachability(reachability: RuntimeReachability): string {
  switch (reachability.status) {
    case "checking": return "Checking…";
    case "online": return reachability.compatible ? "Online" : "Online, but needs an update";
    case "offline":
      switch (reachability.reason) {
        case "timeout": return "Offline — not answering (asleep or offline?)";
        case "unreachable": return "Offline — computer is off, asleep or Nora isn't running";
        case "unavailable": return "Remote access is paused on this computer";
        case "unexpected-reply": return "Offline — unexpected reply";
      }
  }
}
