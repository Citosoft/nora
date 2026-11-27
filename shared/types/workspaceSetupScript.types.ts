/**
 * When a workspace setup script runs on its own. Every script can also be run by hand from the
 * workspace's script menu; "manual" scripts only ever run that way.
 */
export type WorkspaceSetupScriptTrigger = "worktree-create" | "worktree-archive" | "manual";

/** Lifecycle moments that run setup scripts automatically. */
export type WorktreeLifecycleScriptTrigger = Exclude<WorkspaceSetupScriptTrigger, "manual">;

/**
 * Where a script came from. Imported scripts carry their importer's id so a re-import can replace
 * exactly the scripts it wrote earlier without touching the user's own.
 */
export type WorkspaceSetupScriptOrigin =
  | { kind: "user" }
  | {
      kind: "imported";
      /** Stable id of the importing app, for example "t3code" or "orca". */
      importerId: string;
      /** The script's id or name in the source app, when it has one. */
      externalId: string | null;
    };

/** A named shell command configured on a workspace, run in a worktree's directory. */
export interface WorkspaceSetupScript {
  id: string;
  name: string;
  /** Shell command line; may span several lines, run by the user's shell. */
  command: string;
  trigger: WorkspaceSetupScriptTrigger;
  origin: WorkspaceSetupScriptOrigin;
}

/** A script to store; the id is generated when absent and the origin defaults to the user. */
export interface WorkspaceSetupScriptInput {
  id?: string;
  name: string;
  command: string;
  trigger: WorkspaceSetupScriptTrigger;
  origin?: WorkspaceSetupScriptOrigin;
}

/**
 * How to change a workspace's scripts. "replace-all" is the editor's save; "replace-imported"
 * lets an importer refresh the scripts it owns while keeping every other script in place.
 */
export type WorkspaceSetupScriptsUpdate =
  | { kind: "replace-all"; scripts: WorkspaceSetupScriptInput[] }
  | { kind: "replace-imported"; importerId: string; scripts: WorkspaceSetupScriptInput[] };

/** Outcome of running a lifecycle trigger's scripts in one worktree. */
export type WorktreeScriptRunReport =
  | { kind: "none" }
  | { kind: "succeeded"; scriptCount: number }
  | {
      kind: "failed";
      trigger: WorktreeLifecycleScriptTrigger;
      script: WorkspaceSetupScript;
      /** User-facing explanation, ready for the error banner. */
      message: string;
    };
