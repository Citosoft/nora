import { connectorReplySchema, connectorRequestSchema, connectorsChannel } from "@shared/connectors/gateway";
import type { Connector } from "@shared/types/connectors/connectors.types";
import type { ConnectorRequest } from "@shared/ipc/types/connectorGateway.types";
import type { ConnectorIpcDeps } from "@main/types/connectors/connectorIpc.types";

function apply(deps: ConnectorIpcDeps, request: ConnectorRequest): Promise<Connector[]> {
  const { connectors } = deps;
  switch (request.kind) {
    case "list": return Promise.resolve(connectors.list());
    case "create": return connectors.create(request.connector);
    case "set-enabled": return connectors.setEnabled(request.id, request.enabled);
    case "set-access": return connectors.setAccess(request.id, request.access);
    case "remove": return connectors.remove(request.id);
    case "sign-in": return connectors.signIn(request.id);
    case "sign-out": return connectors.signOut(request.id);
    case "refresh": return connectors.refresh(request.id);
  }
}

/** The window adds, signs in to and manages Nora's own connectors here; status changes are pushed separately. */
export function registerConnectorIpc(deps: ConnectorIpcDeps): () => void {
  deps.ipc.handle(connectorsChannel, async (event, input) => {
    if (!deps.isAllowedSender(event)) return { ok: false, message: "This window cannot manage connectors" };
    const parsed = connectorRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "This connector request is not valid" };
    try { return connectorReplySchema.parse({ ok: true, connectors: await apply(deps, parsed.data) }); }
    catch (error) { return { ok: false, message: error instanceof Error && error.message ? error.message : "The connector could not be updated" }; }
  });
  return () => { deps.ipc.removeHandler(connectorsChannel); };
}
