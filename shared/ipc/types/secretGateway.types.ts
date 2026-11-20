import type { z } from "zod";
import type { secretGatewayReplySchema, secretGatewayRequestSchema, secretVaultReplySchema, secretVaultRequestSchema } from "@shared/secrets/gateway";
import type { SecretPrompt, VaultSecret } from "@shared/types/secrets/secrets.types";

export type SecretGatewayRequest = z.infer<typeof secretGatewayRequestSchema>;
export type SecretGatewayReply = z.infer<typeof secretGatewayReplySchema>;
export type SecretVaultRequest = z.infer<typeof secretVaultRequestSchema>;
export type SecretVaultReply = z.infer<typeof secretVaultReplySchema>;
export interface SecretBridge {
  /** Lists the waiting prompts or answers one; resolves with the prompts still waiting. */
  request(input: SecretGatewayRequest): Promise<SecretPrompt[]>;
  /** Called with every waiting prompt whenever the set changes; returns an unsubscribe function. */
  onPromptsChanged(listener: (prompts: SecretPrompt[]) => void): () => void;
  /** Lists, saves or deletes saved secrets; resolves with every saved secret, without values. */
  vault(input: SecretVaultRequest): Promise<VaultSecret[]>;
  /** Called with every saved secret whenever one is saved or deleted; returns an unsubscribe function. */
  onVaultChanged(listener: (secrets: VaultSecret[]) => void): () => void;
}
