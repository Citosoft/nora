import type { SecretBridge } from "@shared/ipc/types/secretGateway.types";

export const secretClient: SecretBridge = {
  request: (input) => window.nora.secrets.request(input),
  onPromptsChanged: (listener) => window.nora.secrets.onPromptsChanged(listener),
  vault: (input) => window.nora.secrets.vault(input),
  onVaultChanged: (listener) => window.nora.secrets.onVaultChanged(listener)
};
