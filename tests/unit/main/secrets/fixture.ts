import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openSecretStore } from "@main/secrets/store";
import { createSecretPrompts } from "@main/secrets/prompts";
import { createSecretService } from "@main/secrets/service";
import type { SecretCodec } from "@main/types/secretEncryption.types";
import type { SecretCommandInput, SecretCommandResult, SecretOrigin } from "@main/types/secrets/secrets.types";
import type { SecretPrompt, VaultSecret } from "@shared/types/secrets/secrets.types";

/** Marks values as "encrypted" so tests can see secrets never reach the file in the clear; `locked` stands in for an unavailable keychain. */
export function testSecretCodec(): SecretCodec & { locked: boolean } {
  return {
    locked: false,
    encrypt(secret) { if (this.locked) throw new Error("Keychain is locked"); return `enc:${Buffer.from(secret).toString("base64")}`; },
    decrypt(stored) { if (this.locked) throw new Error("Keychain is locked"); return Buffer.from(stored.slice(4), "base64").toString("utf8"); }
  };
}

export const origin = (extra: Partial<SecretOrigin> = {}): SecretOrigin =>
  ({ conversationId: "thread", conversationIds: ["thread"], requester: "Nora", projectId: "w", workspaceName: "Web", ...extra });

/** A secret service over a real store in a temporary directory, with a recorded stand-in for running commands. */
export function secretsFixture(options: { timeoutMs?: number } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "nora-secrets-"));
  process.once("exit", () => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "secrets.json");
  const codec = testSecretCodec();
  const now = (): string => "2026-11-18T00:00:00.000Z";
  const vaultChanges: VaultSecret[][] = [];
  const open = () => openSecretStore({ path, codec, now, onChanged: (secrets) => { vaultChanges.push(secrets); } });
  const store = open();
  const changes: SecretPrompt[][] = [];
  let sequence = 0;
  const prompts = createSecretPrompts({ nextId: () => `prompt${++sequence}`, now, timeoutMs: options.timeoutMs ?? 60_000, onChanged: (pending) => { changes.push(pending); } });
  const commands: SecretCommandInput[] = [];
  const state: { result: SecretCommandResult } = { result: { exitCode: 0, output: "", timedOut: false } };
  const service = createSecretService({ store, prompts, runCommand: async (input) => { commands.push(input); return state.result; } });
  /** Resolves with the next prompt to open, as the window would see it arrive. */
  const nextPrompt = async (): Promise<SecretPrompt> => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const [prompt] = service.pending();
      if (prompt) return prompt;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error("No secret prompt opened");
  };
  return { service, store, reopen: open, path, codec, changes, vaultChanges, commands, state, nextPrompt };
}
