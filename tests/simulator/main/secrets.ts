import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { openSecretStore } from "@main/secrets/store";
import { createSecretPrompts } from "@main/secrets/prompts";
import { createSecretService } from "@main/secrets/service";
import type { SecretCodec } from "@main/types/secretEncryption.types";
import type { SecretCommandRunner, SecretOrigin, SecretService } from "@main/types/secrets/secrets.types";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { SimulatedSecretEvents } from "../types/secrets.types";

/** Obscures values in the simulator's temporary file without touching the real OS keychain. */
const simulatedCodec: SecretCodec = {
  encrypt: (secret) => `sim:${Buffer.from(secret, "utf8").toString("base64")}`,
  decrypt: (stored) => Buffer.from(stored.slice(4), "base64").toString("utf8")
};

/** Runs nothing. It "prints" each secret it was handed, so the scenario shows the real redaction replacing them. */
const simulatedCommand: SecretCommandRunner = async ({ command, env }) => ({ exitCode: 0, timedOut: false,
  output: [`$ ${command}`, ...Object.entries(env).map(([name, value]) => `debug: authenticating with ${name}=${value}`), "Simulated command finished. Nothing was executed."].join("\n") });

/**
 * The production secret service, prompts and redaction over a store in the simulator's temporary directory. Only the keychain
 * and the command are simulated, so the dialogs in the window are the ones the app shows.
 */
export function createSimulatedSecrets(directory: string, events: SimulatedSecretEvents): SecretService {
  const now = (): string => new Date().toISOString();
  return createSecretService({ runCommand: simulatedCommand,
    store: openSecretStore({ path: join(directory, "secrets.json"), codec: simulatedCodec, now, onChanged: events.vaultChanged }),
    prompts: createSecretPrompts({ nextId: randomUUID, now, timeoutMs: 15 * 60_000, onChanged: events.promptsChanged }) });
}

export function simulatedSecretOrigin(conversation: Conversation): SecretOrigin {
  return { conversationId: conversation.id, conversationIds: [conversation.id], requester: "Nora", projectId: conversation.workspace.projectId, workspaceName: "Chat simulator" };
}
