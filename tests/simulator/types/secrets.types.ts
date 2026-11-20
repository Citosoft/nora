import type { SecretPrompt, VaultSecret } from "@shared/types/secrets/secrets.types";

/** Where the simulator pushes secret changes: to its window, once one exists. */
export interface SimulatedSecretEvents {
  promptsChanged(prompts: SecretPrompt[]): void;
  vaultChanged(secrets: VaultSecret[]): void;
}
