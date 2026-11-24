import { DIRECTORY_ROUTES, provisionRuntimeResponseSchema, runtimeResponseSchema, directoryErrorSchema, deleteRuntimeResponseSchema } from "@shared/remote-access/directory";
import type { ControlPlaneOptions, RemoteControlPlane } from "@main/types/remote-access/controlPlane.types";
import { NORA_RELAY_NAME } from "@shared/remote-access/constants";

export function createRemoteControlPlane(options: ControlPlaneOptions): RemoteControlPlane {
  const origin = new URL(options.origin);
  if (origin.protocol !== "https:" || origin.origin !== options.origin) throw new Error(`${NORA_RELAY_NAME} requires a secure control-plane origin.`);
  const request = async (session: Parameters<RemoteControlPlane["remove"]>[0], path: string, method: string, signal: AbortSignal, body?: string) => {
    const timeout = AbortSignal.any([signal, AbortSignal.timeout(20_000)]);
    const token = await options.sessionToken(session, timeout);
    const response = await options.fetch(new URL(path, origin), { method, signal: timeout, redirect: "error",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(body ? { body } : {}) });
    const input: unknown = await response.json();
    timeout.throwIfAborted();
    if (!response.ok) {
      if (method === "DELETE" && response.status === 404) return null;
      const failure = directoryErrorSchema.safeParse(input);
      throw new Error(failure.success ? failure.data.error.message : `The ${NORA_RELAY_NAME} service could not complete this request.`);
    }
    return input;
  };
  return {
    async provision(session, input, signal) { return provisionRuntimeResponseSchema.parse(await request(session, DIRECTORY_ROUTES.provision, "POST", signal, JSON.stringify(input))); },
    async rename(session, id, name, signal) { return runtimeResponseSchema.parse(await request(session, DIRECTORY_ROUTES.runtime(id), "PATCH", signal, JSON.stringify({ name }))).runtime; },
    async rotate(session, id, signal) { return provisionRuntimeResponseSchema.parse(await request(session, DIRECTORY_ROUTES.rotate(id), "POST", signal)); },
    async remove(session, id, signal) { const result = await request(session, DIRECTORY_ROUTES.runtime(id), "DELETE", signal); if (result !== null) deleteRuntimeResponseSchema.parse(result); }
  };
}
