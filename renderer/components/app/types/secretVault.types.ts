import type { SecretBridge } from "@shared/ipc/types/secretGateway.types";
import type { VaultSecret } from "@shared/types/secrets/secrets.types";

export type SecretVaultClient = Pick<SecretBridge, "vault" | "onVaultChanged">;
/** A workspace a secret can be saved for, as Settings names it. */
export interface VaultWorkspaceChoice { id: string; name: string; }
/** What the user types to add a secret or replace one's value; `projectId` is empty for every workspace. */
export interface VaultSecretForm { name: string; purpose: string; projectId: string; value: string; }
export type VaultSecretSave = Pick<VaultSecret, "name" | "purpose" | "projectId"> & { value: string };
export type VaultSecretFormResult = { ok: true; secret: VaultSecretSave } | { ok: false; message: string };
/** The dialog adds a new secret or replaces the value of a saved one, whose name and scope stay fixed. */
export type VaultDialogTarget = { kind: "add" } | { kind: "replace"; secret: VaultSecret };
export interface SecretVault {
  /** Null until the first load finishes. */
  secrets: readonly VaultSecret[] | null;
  loadError: string | null;
  save(secret: VaultSecretSave): Promise<void>;
  remove(secret: Pick<VaultSecret, "name" | "projectId">): Promise<void>;
}
export interface VaultSecretRowProps {
  secret: VaultSecret;
  scopeLabel: string;
  onReplace(secret: VaultSecret): void;
  onDelete(secret: VaultSecret): void;
}
export interface VaultSecretDialogProps {
  /** Null while closed. */
  target: VaultDialogTarget | null;
  workspaces: readonly VaultWorkspaceChoice[];
  onClose(): void;
  onSave(secret: VaultSecretSave): Promise<void>;
}
export interface DeleteVaultSecretDialogProps {
  /** Null while closed. */
  secret: VaultSecret | null;
  scopeLabel: string;
  onClose(): void;
  onDelete(secret: VaultSecret): Promise<void>;
}
