import type {
  WorkspaceSetupScript,
  WorkspaceSetupScriptInput,
  WorkspaceSetupScriptOrigin,
  WorkspaceSetupScriptTrigger,
  WorkspaceSetupScriptsUpdate,
  WorktreeLifecycleScriptTrigger
} from "./types/workspaceSetupScript.types";

export const WORKSPACE_SETUP_SCRIPT_TRIGGERS: readonly WorkspaceSetupScriptTrigger[] = [
  "worktree-create",
  "worktree-archive",
  "manual"
];

const USER_ORIGIN: WorkspaceSetupScriptOrigin = { kind: "user" };

export function isWorkspaceSetupScriptTrigger(value: unknown): value is WorkspaceSetupScriptTrigger {
  return typeof value === "string" && (WORKSPACE_SETUP_SCRIPT_TRIGGERS as readonly string[]).includes(value);
}

export function describeWorkspaceSetupScriptTrigger(trigger: WorkspaceSetupScriptTrigger): string {
  switch (trigger) {
    case "worktree-create":
      return "When a worktree is created";
    case "worktree-archive":
      return "Before a worktree is removed";
    case "manual":
      return "Only when run manually";
  }
}

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOrigin(value: unknown): WorkspaceSetupScriptOrigin {
  if (!value || typeof value !== "object") {
    return USER_ORIGIN;
  }
  const candidate = value as Record<string, unknown>;
  const importerId = readTrimmedString(candidate.importerId);
  if (candidate.kind !== "imported" || !importerId) {
    return USER_ORIGIN;
  }
  const externalId = readTrimmedString(candidate.externalId);
  return { kind: "imported", importerId, externalId: externalId || null };
}

/**
 * Tolerantly reads stored or submitted scripts. Entries without a command are dropped, an unknown
 * trigger falls back to "manual" so nothing starts running unexpectedly, and ids are made unique.
 */
export function normalizeWorkspaceSetupScripts(value: unknown): WorkspaceSetupScript[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seenIds = new Set<string>();
  return value.flatMap((entry, index): WorkspaceSetupScript[] => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const candidate = entry as Record<string, unknown>;
    const command = readTrimmedString(candidate.command);
    if (!command) {
      return [];
    }
    const preferredId = readTrimmedString(candidate.id) || `setup-script-${index + 1}`;
    const id = seenIds.has(preferredId) ? `${preferredId}-${index + 1}` : preferredId;
    seenIds.add(id);
    return [{
      id,
      name: readTrimmedString(candidate.name) || command.split("\n")[0],
      command,
      trigger: isWorkspaceSetupScriptTrigger(candidate.trigger) ? candidate.trigger : "manual",
      origin: normalizeOrigin(candidate.origin)
    }];
  });
}

function materializeInputs(
  inputs: WorkspaceSetupScriptInput[],
  createId: () => string,
  originFor: (input: WorkspaceSetupScriptInput) => WorkspaceSetupScriptOrigin
): WorkspaceSetupScript[] {
  return normalizeWorkspaceSetupScripts(
    inputs.map((input) => ({ ...input, id: input.id?.trim() || createId(), origin: originFor(input) }))
  );
}

/** Applies an editor save or an importer refresh to a workspace's current scripts. */
export function applyWorkspaceSetupScriptsUpdate(
  current: WorkspaceSetupScript[],
  update: WorkspaceSetupScriptsUpdate,
  createId: () => string
): WorkspaceSetupScript[] {
  switch (update.kind) {
    case "replace-all":
      return materializeInputs(update.scripts, createId, (input) => input.origin ?? USER_ORIGIN);
    case "replace-imported": {
      const importerId = update.importerId.trim();
      if (!importerId) {
        throw new Error("An importer id is required to replace imported setup scripts.");
      }
      const ownedByImporter = (script: WorkspaceSetupScript) =>
        script.origin.kind === "imported" && script.origin.importerId === importerId;
      const imported = materializeInputs(update.scripts, createId, (input) => ({
        kind: "imported",
        importerId,
        externalId: input.origin?.kind === "imported" ? input.origin.externalId : null
      }));
      // Re-imports keep their earlier position so the run order of the user's other scripts holds.
      const firstOwnedIndex = current.findIndex(ownedByImporter);
      const kept = current.filter((script) => !ownedByImporter(script));
      const insertAt = firstOwnedIndex === -1 ? kept.length : firstOwnedIndex;
      return normalizeWorkspaceSetupScripts([...kept.slice(0, insertAt), ...imported, ...kept.slice(insertAt)]);
    }
  }
}

/** The scripts a lifecycle moment runs, in their configured order. */
export function selectWorkspaceSetupScriptsForTrigger(
  scripts: readonly WorkspaceSetupScript[] | undefined,
  trigger: WorktreeLifecycleScriptTrigger
): WorkspaceSetupScript[] {
  return (scripts ?? []).filter((script) => script.trigger === trigger);
}

function readErrorOutput(error: unknown, key: "stderr" | "stdout"): string {
  if (!error || typeof error !== "object" || !(key in error)) {
    return "";
  }
  const output = (error as Record<string, unknown>)[key];
  return typeof output === "string" ? output : "";
}

/** The last meaningful line a failed command printed, falling back to the error's own message. */
export function describeWorkspaceSetupScriptError(error: unknown): string {
  for (const output of [readErrorOutput(error, "stderr"), readErrorOutput(error, "stdout")]) {
    const lastLine = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).at(-1);
    if (lastLine) {
      return lastLine;
    }
  }
  return error instanceof Error && error.message.trim() ? error.message.trim() : "Unknown error";
}

export function formatWorktreeScriptFailureMessage(
  script: Pick<WorkspaceSetupScript, "name">,
  trigger: WorktreeLifecycleScriptTrigger,
  branch: string,
  detail: string
): string {
  const moment = trigger === "worktree-create" ? `after creating worktree ${branch}` : `before removing worktree ${branch}`;
  return `Setup script "${script.name}" failed ${moment}: ${detail}`;
}
