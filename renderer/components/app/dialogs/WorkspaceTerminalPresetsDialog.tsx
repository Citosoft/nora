import { TerminalPresetsSettingsSection } from "@/components/app/panels/settings/TerminalPresetsSettingsSection";
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

  useEffect(() => {
    if (!open) {
      setIsSaving(false);
      return;
    }

    setDraftPresets(project?.workspaceTerminalPresets ?? []);
  }, [open, project]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        headerTitle={project ? `${project.name} Presets` : "Workspace Presets"}
        className="!w-[min(1200px,calc(100vw-2rem))] max-w-none"
      >
        <DialogHeader>
          <DialogTitle>Workspace terminal presets</DialogTitle>
          <DialogDescription>
            These presets only appear for this workspace and use the same launch flow as global presets.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <TerminalPresetsSettingsSection
            presets={draftPresets}
            terminalShells={terminalShells}
            defaultWorkingDirectory={project?.rootPath || ""}
            onChange={setDraftPresets}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setIsSaving(true);
              void Promise.resolve(onChange(draftPresets)).finally(() => {
                setIsSaving(false);
              });
            }}
            disabled={!project || isSaving}
          >
            {isSaving ? "Saving" : "Save presets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
