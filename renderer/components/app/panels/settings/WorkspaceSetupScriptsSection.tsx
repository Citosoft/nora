import { createEmptyWorkspaceSetupScript, hasIncompleteSetupScripts } from "@/components/app/logic/workspaceSetupScripts";
import { WorkspaceSetupScriptRow } from "@/components/app/panels/settings/WorkspaceSetupScriptRow";
import type { WorkspaceSetupScriptsSectionProps } from "@/components/app/types/workspaceSetupScripts.types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const createScriptId = (): string => globalThis.crypto.randomUUID();

/** Lists a workspace's setup scripts for editing; changes stay in the caller's draft until saved. */
export function WorkspaceSetupScriptsSection({ scripts, onChange }: WorkspaceSetupScriptsSectionProps) {
  return (
    <section aria-labelledby="workspace-setup-scripts-heading" className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-card p-4">
        <div>
          <h3 id="workspace-setup-scripts-heading" className="text-sm font-medium text-foreground">Setup scripts</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Run in a worktree&apos;s folder, in order, when it is created or before it is removed. A failing script stops the
            ones after it but never blocks the worktree. Every script can also be run from the workspace&apos;s Run script menu.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onChange([...scripts, createEmptyWorkspaceSetupScript(createScriptId)])}>
          <Plus className="size-4" />
          Add script
        </Button>
      </div>
      {scripts.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">No setup scripts yet.</p>
      ) : (
        <ul className="space-y-3">
          {scripts.map((script) => (
            <WorkspaceSetupScriptRow
              key={script.id}
              script={script}
              onChange={(next) => onChange(scripts.map((entry) => (entry.id === script.id ? next : entry)))}
              onRemove={() => onChange(scripts.filter((entry) => entry.id !== script.id))}
            />
          ))}
        </ul>
      )}
      {hasIncompleteSetupScripts(scripts) ? (
        <p className="px-1 text-xs text-muted-foreground" role="status">Scripts without a command are not saved.</p>
      ) : null}
    </section>
  );
}
