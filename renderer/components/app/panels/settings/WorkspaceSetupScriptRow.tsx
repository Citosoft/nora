import type { WorkspaceSetupScriptRowProps } from "@/components/app/types/workspaceSetupScripts.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { describeWorkspaceSetupScriptTrigger, isWorkspaceSetupScriptTrigger, WORKSPACE_SETUP_SCRIPT_TRIGGERS } from "@shared/workspaceSetupScripts";
import { importerDisplayName } from "@shared/app-import/sources";
import { Trash2 } from "lucide-react";
import { useId } from "react";

/** One editable setup script: name, when it runs and the command itself. */
export function WorkspaceSetupScriptRow({ script, onChange, onRemove }: WorkspaceSetupScriptRowProps) {
  const fieldId = useId();
  const label = script.name.trim() || "untitled script";
  return (
    <li className="space-y-3 rounded-lg border border-border/60 bg-background p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,240px)_auto] items-end gap-3">
        <div className="space-y-1">
          <label htmlFor={`${fieldId}-name`} className="text-xs font-medium text-muted-foreground">Name</label>
          <Input
            id={`${fieldId}-name`}
            value={script.name}
            placeholder="Install dependencies"
            onChange={(event) => onChange({ ...script, name: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <span aria-hidden="true" className="text-xs font-medium text-muted-foreground">Runs</span>
          <Select
            aria-label={`When ${label} runs`}
            value={script.trigger}
            onChange={(event) => {
              const trigger = event.target.value;
              if (isWorkspaceSetupScriptTrigger(trigger)) onChange({ ...script, trigger });
            }}
          >
            {WORKSPACE_SETUP_SCRIPT_TRIGGERS.map((trigger) => (
              <option key={trigger} value={trigger}>{describeWorkspaceSetupScriptTrigger(trigger)}</option>
            ))}
          </Select>
        </div>
        <Button variant="outline" size="icon" aria-label={`Remove ${label}`} onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="space-y-1">
        <label htmlFor={`${fieldId}-command`} className="text-xs font-medium text-muted-foreground">Command</label>
        <Textarea
          id={`${fieldId}-command`}
          value={script.command}
          placeholder="npm install"
          spellCheck={false}
          className="min-h-[64px] font-mono text-xs"
          onChange={(event) => onChange({ ...script, command: event.target.value })}
        />
      </div>
      {script.origin.kind === "imported" ? (
        <p className="text-xs text-muted-foreground">Imported from {importerDisplayName(script.origin.importerId)}. Importing again replaces it.</p>
      ) : null}
    </li>
  );
}
