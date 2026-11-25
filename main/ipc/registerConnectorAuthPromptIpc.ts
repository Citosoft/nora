import {
  connectorAuthPromptGatewayReplySchema,
  connectorAuthPromptGatewayRequestSchema,
  connectorAuthPromptsChannel
} from "@shared/connectors/authPrompt";
import type { ConnectorAuthPromptIpcDeps } from "@main/types/connectors/authPromptIpc.types";

/**
 * The window answers connector authorize prompts here. Authorize starts browser sign-in; decline settles the waiting
 * gateway call. Sign-in completion settles open prompts through the connector service.
 */
export function registerConnectorAuthPromptIpc(deps: ConnectorAuthPromptIpcDeps): () => void {
  deps.ipc.handle(connectorAuthPromptsChannel, async (event, input) => {
    if (!deps.isAllowedSender(event)) return { ok: false, message: "This window cannot answer connector sign-in requests" };
    const parsed = connectorAuthPromptGatewayRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "This connector sign-in request is not valid" };
    try {
      const request = parsed.data;
      if (request.kind === "decline") deps.prompts.settle(request.promptId, { kind: "declined" });
      else if (request.kind === "authorize") {
        const prompt = deps.prompts.get(request.promptId);
        if (prompt) await deps.connectors.signIn(prompt.connectorId);
      }
      return connectorAuthPromptGatewayReplySchema.parse({ ok: true, prompts: deps.prompts.pending() });
    } catch (error) {
      return { ok: false, message: error instanceof Error && error.message ? error.message : "The connector sign-in request could not be answered" };
    }
  });
  return () => { deps.ipc.removeHandler(connectorAuthPromptsChannel); };
}
