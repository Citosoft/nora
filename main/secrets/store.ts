import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { secretNameSchema } from "@shared/secrets/contracts";
import { isNodeError } from "@main/nodeErrors";
import type { SecretScope, SecretSummary, VaultSecret } from "@shared/types/secrets/secrets.types";
import type { SecretLocation, SecretStore, SecretStoreOptions } from "@main/types/secrets/secrets.types";

/** `projectId` is null for a secret that applies in every workspace. */
const recordSchema = z.object({ name: secretNameSchema, projectId: z.string().min(1).nullable(), purpose: z.string(),
  value: z.string().min(1), createdAt: z.string().min(1), updatedAt: z.string().min(1) });
const fileSchema = z.object({ version: z.literal(1), secrets: z.array(recordSchema) });
type SecretRecord = z.infer<typeof recordSchema>;

/** The stored location a thread means by a name and scope: its own workspace, or every workspace. */
export const secretLocation = (name: string, scope: SecretScope, projectId: string): SecretLocation =>
  ({ name, projectId: scope === "workspace" ? projectId : null });
const vaultSecretOf = ({ name, purpose, projectId, updatedAt }: SecretRecord): VaultSecret => ({ name, purpose, projectId, updatedAt });
const summaryOf = (record: SecretRecord): SecretSummary =>
  ({ name: record.name, purpose: record.purpose, scope: record.projectId ? "workspace" : "everywhere", updatedAt: record.updatedAt });

/**
 * Saved secrets live in one JSON file in Nora's state directory: what each is for and where it applies in the clear, its value
 * encrypted with a key held in the OS keychain. Values are only decrypted by `values`. Writes replace the file atomically.
 */
export function openSecretStore({ path, codec, now, onChanged }: SecretStoreOptions): SecretStore {
  let records = read();

  function read(): SecretRecord[] {
    try { return fileSchema.parse(JSON.parse(readFileSync(path, "utf8"))).secrets; }
    catch (error) {
      if (!isNodeError(error) || error.code !== "ENOENT") console.error("Saved secrets could not be read; starting without them", error);
      return [];
    }
  }
  function write(next: SecretRecord[]): void {
    mkdirSync(dirname(path), { recursive: true });
    const temporary = `${path}.tmp`;
    writeFileSync(temporary, JSON.stringify({ version: 1, secrets: next }, null, 2), { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, path);
    records = next;
    onChanged?.(all());
  }
  /** Sorted by name, a name's everywhere secret before its workspace ones. */
  const all = (): VaultSecret[] => records.map(vaultSecretOf)
    .sort((left, right) => left.name.localeCompare(right.name) || (left.projectId ?? "").localeCompare(right.projectId ?? ""));
  const at = (location: SecretLocation): SecretRecord | undefined =>
    records.find((record) => record.name === location.name && record.projectId === location.projectId);
  /** The record a workspace's threads see under a name: its own, else the everywhere one. */
  const visible = (name: string, projectId: string): SecretRecord | undefined =>
    records.find((record) => record.name === name && record.projectId === projectId) ?? records.find((record) => record.name === name && record.projectId === null);

  return {
    all,
    list(projectId) {
      const names = [...new Set(records.filter((record) => record.projectId === null || record.projectId === projectId).map((record) => record.name))].sort();
      return names.flatMap((name) => { const record = visible(name, projectId); return record ? [summaryOf(record)] : []; });
    },
    has: (location) => !!at(location),
    save(secret) {
      const previous = at(secret);
      const time = now();
      // Encrypt first: a locked keychain must fail the save before anything is written.
      const record: SecretRecord = { name: secret.name, projectId: secret.projectId, purpose: secret.purpose, value: codec.encrypt(secret.value),
        createdAt: previous?.createdAt ?? time, updatedAt: time };
      write([...records.filter((entry) => entry !== previous), record]);
    },
    remove(location) {
      const record = at(location);
      if (record) write(records.filter((entry) => entry !== record));
      return !!record;
    },
    values(names, projectId) {
      return new Map(names.map((name) => {
        const record = visible(name, projectId);
        if (!record) throw new Error(`No saved secret is named ${name}. See list_secrets, or ask the user for it with request_secret.`);
        return [name, codec.decrypt(record.value)];
      }));
    }
  };
}
