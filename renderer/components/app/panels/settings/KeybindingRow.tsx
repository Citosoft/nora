import { SettingsCardRow } from "@/components/app/panels/settings/settingsUi";
import type { KeybindingRowProps } from "@/components/app/types/keybindingSettings.types";
import { Button } from "@/components/ui/button";
import { RotateCcw, X } from "lucide-react";

function KeybindingDescription({ row }: Pick<KeybindingRowProps, "row">) {
  return (
    <>
      <span>{row.command.description}</span>
      {row.isCustomized ? <span className="block text-xs">Default: {row.defaultLabel ?? "Unbound"}</span> : null}
      {row.conflictsWith.length > 0 ? (
        <span role="status" className="block text-xs text-destructive">
          Also bound to {row.conflictsWith.join(", ")}. Only the first matching command runs.
        </span>
      ) : null}
    </>
  );
}

/** One command: its chord (click to record a new one), plus unbind and reset-to-default actions. */
export function KeybindingRow({ row, recording, recordingHint, disabled, onRecord, onCancelRecording, onUnbind, onReset }: KeybindingRowProps) {
  const { title } = row.command;
  const chordText = recording ? recordingHint ?? "Press a shortcut…" : row.label ?? "Unbound";
  return (
    <SettingsCardRow
      title={title}
      description={<KeybindingDescription row={row} />}
      control={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={recording}
            aria-label={recording ? `Recording shortcut for ${title}. Press Escape to cancel.` : `Change shortcut for ${title} (currently ${row.label ?? "unbound"})`}
            disabled={disabled && !recording}
            onClick={recording ? onCancelRecording : onRecord}
            className={`min-w-[7.5rem] justify-center font-mono ${recording ? "border-ring text-muted-foreground" : ""} ${row.conflictsWith.length > 0 ? "border-destructive/60" : ""}`}
          >
            {chordText}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" disabled={disabled || recording || !row.label}
            onClick={onUnbind} tooltip="Remove shortcut" aria-label={`Remove shortcut for ${title}`}>
            <X className="size-3.5" aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" disabled={disabled || recording || !row.isCustomized}
            onClick={onReset} tooltip="Reset to default" aria-label={`Reset shortcut for ${title} to default`}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
          </Button>
        </>
      }
    />
  );
}
