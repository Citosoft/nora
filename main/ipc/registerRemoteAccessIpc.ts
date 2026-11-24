import { remoteAccessChannel, remoteAccessReplySchema, remoteAccessRequestSchema } from "@shared/remote-access/gateway";
import type { RemoteAccessReply, RemoteAccessRequest } from "@shared/types/remote-access/remoteAccess.types";
import type { RemoteAccessIpcDeps } from "@main/types/remote-access/remoteAccessIpc.types";
import { NORA_RELAY_NAME } from "@shared/remote-access/constants";

async function apply(deps: RemoteAccessIpcDeps, request: RemoteAccessRequest): Promise<RemoteAccessReply> {
  const { service } = deps;
  switch (request.kind) {
    case "view": return { ok: true, view: service.view() };
    case "enable": return { ok: true, view: await service.enable() };
    case "disable": return { ok: true, view: await service.disable() };
    case "retry": return { ok: true, view: await service.retry() };
    case "rename": return { ok: true, view: await service.rename(request.name) };
    case "rotate": return { ok: true, view: await service.rotate() };
    case "disconnect-device": return { ok: true, view: await service.disconnectDevice(request.deviceId) };
    case "activity": return { ok: true, activity: await service.activity(request.limit ?? 50) };
  }
}

/** The Remote access settings group reads and changes remote access here; status changes are pushed separately. */
export function registerRemoteAccessIpc(deps: RemoteAccessIpcDeps): () => void {
  deps.ipc.handle(remoteAccessChannel, async (event, input) => {
    if (!deps.isAllowedSender(event)) return { ok: false, message: `This window cannot manage ${NORA_RELAY_NAME}` };
    const parsed = remoteAccessRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? `This ${NORA_RELAY_NAME} request is not valid` };
    try { return remoteAccessReplySchema.parse(await apply(deps, parsed.data)); }
    catch (error) { return { ok: false, message: error instanceof Error && error.message ? error.message : `${NORA_RELAY_NAME} could not be updated` }; }
  });
  return () => { deps.ipc.removeHandler(remoteAccessChannel); };
}
