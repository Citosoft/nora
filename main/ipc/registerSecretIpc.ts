import { secretGatewayReplySchema, secretGatewayRequestSchema, secretVaultChannel, secretVaultReplySchema, secretVaultRequestSchema, secretsChannel } from "@shared/secrets/gateway";
import type { SecretIpcDeps } from "@main/types/secrets/secretIpc.types";

/**
 * The window answers secret prompts and manages saved secrets here. These are the only channels a secret's value crosses, and
 * only inwards: nothing about a request is logged, validation messages are fixed text rather than an echo of what was sent,
 * and replies carry names and purposes, never values.
 */
export function registerSecretIpc(deps: SecretIpcDeps): () => void {
  deps.ipc.handle(secretsChannel, async (event, input) => {
    if (!deps.isAllowedSender(event)) return { ok: false, message: "This window cannot answer secret requests" };
    const parsed = secretGatewayRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "This secret request is not valid" };
    try {
      if (parsed.data.kind !== "pending") deps.secrets.answer(parsed.data);
      return secretGatewayReplySchema.parse({ ok: true, prompts: deps.secrets.pending() });
    } catch (error) { return { ok: false, message: error instanceof Error && error.message ? error.message : "The secret request could not be answered" }; }
  });
  deps.ipc.handle(secretVaultChannel, async (event, input) => {
    if (!deps.isAllowedSender(event)) return { ok: false, message: "This window cannot manage saved secrets" };
    const parsed = secretVaultRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "This saved secret is not valid. Check its name and value." };
    try {
      const request = parsed.data;
      if (request.kind === "save") deps.secrets.save({ name: request.name, projectId: request.projectId, purpose: request.purpose, value: request.value });
      else if (request.kind === "remove") deps.secrets.remove({ name: request.name, projectId: request.projectId });
      return secretVaultReplySchema.parse({ ok: true, secrets: deps.secrets.vault() });
    } catch (error) { return { ok: false, message: error instanceof Error && error.message ? error.message : "The saved secret could not be updated" }; }
  });
  return () => { deps.ipc.removeHandler(secretsChannel); deps.ipc.removeHandler(secretVaultChannel); };
}
