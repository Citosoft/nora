import { secretNameSchema, secretValueSchema } from "@shared/secrets/contracts";
import type { VaultSecret } from "@shared/types/secrets/secrets.types";
import type { VaultDialogTarget, VaultSecretForm, VaultSecretFormResult, VaultWorkspaceChoice } from "@/components/app/types/secretVault.types";

export const EVERY_WORKSPACE_LABEL = "Every workspace";

/** A name can be saved once for every workspace and once per workspace, so both parts identify a row. */
export const vaultSecretKey = (secret: Pick<VaultSecret, "name" | "projectId">): string => `${secret.projectId ?? ""}:${secret.name}`;

/** Where a secret applies, in the user's words; a workspace that is no longer open in Nora is still named as one. */
export function vaultScopeLabel(projectId: string | null, workspaces: readonly VaultWorkspaceChoice[]): string {
  if (projectId === null) return EVERY_WORKSPACE_LABEL;
  return workspaces.find((workspace) => workspace.id === projectId)?.name ?? "A workspace no longer in Nora";
}

/** Shapes typing into an environment-variable name as the user goes: capitals, with spaces and hyphens as underscores. */
export const normalizeSecretName = (typed: string): string => typed.toUpperCase().replace(/[\s-]+/g, "_").replace(/[^A-Z0-9_]/g, "");

/** The form a dialog opens with: empty for a new secret, or a saved one's details with a blank value to fill in. */
export function vaultFormFor(target: VaultDialogTarget): VaultSecretForm {
  return target.kind === "replace" ? { name: target.secret.name, purpose: target.secret.purpose, projectId: target.secret.projectId ?? "", value: "" }
    : { name: "", purpose: "", projectId: "", value: "" };
}

export function buildVaultSecret(form: VaultSecretForm): VaultSecretFormResult {
  const name = secretNameSchema.safeParse(form.name);
  if (!name.success) return { ok: false, message: "Name the secret like an environment variable: capital letters, digits and underscores, starting with a letter." };
  const value = secretValueSchema.safeParse(form.value);
  if (!value.success) return { ok: false, message: value.error.issues[0]?.message ?? "Enter a value to save" };
  return { ok: true, secret: { name: name.data, purpose: form.purpose.trim(), projectId: form.projectId || null, value: value.data } };
}
