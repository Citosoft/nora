import { useWorkspaceSetupScriptsDraft } from "@/components/app/hooks/useWorkspaceSetupScriptsDraft";
import { TerminalPresetsSettingsSection } from "@/components/app/panels/settings/TerminalPresetsSettingsSection";
import { WorkspaceSetupScriptsSection } from "@/components/app/panels/settings/WorkspaceSetupScriptsSection";
import type { WorkspaceTerminalPresetsDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type { AppSettings } from "@shared/appTypes";
import { useEffect, useState } from "react";

export function WorkspaceTerminalPresetsDialog({
  open,
  project,
  terminalShells,
  onOpenChange,
  onChange
}: WorkspaceTerminalPresetsDialogProps) {
  const [draftPresets, setDraftPresets] = useState<AppSettings["terminalPresets"]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const setupScripts = useWorkspaceSetupScriptsDraft({ open, project });

  useEffect(() => {
    if (!open) {
      setIsSaving(false);
      return;
    }

    setDraftPresets(project?.workspaceTerminalPresets ?? []);
  }, [open, project]);

  const save = async () => {
    setIsSaving(true);
    try {
      // Setup scripts save first: the presets save closes the dialog, which would hide a scripts error.
      if (await setupScripts.save()) {
        await onChange(draftPresets);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        headerTitle={project ? `${project.name} Terminal Settings` : "Project Terminal Settings"}
        className="!w-[min(1200px,calc(100vw-2rem))] max-w-none"
      >
        <DialogHeader>
          <DialogTitle>Project presets and setup scripts</DialogTitle>
          <DialogDescription>
            Presets only appear for this project and use the same launch flow as global presets. Setup scripts run in this
            project&apos;s worktrees.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-6">
          <TerminalPresetsSettingsSection
            presets={draftPresets}
            terminalShells={terminalShells}
            defaultWorkingDirectory={project?.rootPath || ""}
            onChange={setDraftPresets}
          />
          <WorkspaceSetupScriptsSection scripts={setupScripts.scripts} onChange={setupScripts.setScripts} />
        </DialogBody>
        <DialogFooter>
          {setupScripts.saveError ? (
            <p role="alert" className="mr-auto text-sm text-destructive">{setupScripts.saveError}</p>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={!project || isSaving}>
            {isSaving ? "Saving" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
