import { secretGatewayReplySchema, secretPromptsChangedChannel, secretVaultChangedChannel, secretVaultChannel, secretVaultReplySchema, secretsChannel } from "@shared/secrets/gateway";
import type { SecretPrompt, VaultSecret } from "@shared/types/secrets/secrets.types";
import type { SecretBridge } from "@shared/ipc/types/secretGateway.types";
import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createSecretBridge(): SecretBridge {
  return {
    async request(input) {
      const reply = secretGatewayReplySchema.safeParse(await invokeIpc(secretsChannel, input));
      if (!reply.success) throw new Error("Nora returned an incompatible response for secrets");
      if (!reply.data.ok) throw new Error(reply.data.message);
      return reply.data.prompts;
    },
    onPromptsChanged: (listener) => subscribeToIpcEvent<SecretPrompt[]>(secretPromptsChangedChannel, listener),
    async vault(input) {
      const reply = secretVaultReplySchema.safeParse(await invokeIpc(secretVaultChannel, input));
      if (!reply.success) throw new Error("Nora returned an incompatible response for saved secrets");
      if (!reply.data.ok) throw new Error(reply.data.message);
      return reply.data.secrets;
    },
    onVaultChanged: (listener) => subscribeToIpcEvent<VaultSecret[]>(secretVaultChangedChannel, listener)
  };
}
