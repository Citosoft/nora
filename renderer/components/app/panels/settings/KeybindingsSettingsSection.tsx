import { useKeybindings } from "@/components/app/hooks/useKeybindings";
import { useKeybindingUpdates } from "@/components/app/hooks/useKeybindingUpdates";
import { useKeyChordRecorder } from "@/components/app/hooks/useKeyChordRecorder";
import { buildKeybindingSettingsGroups, hasKeybindingOverrides } from "@/components/app/logic/keybindings/keybindingSettingsRows";
import { KeybindingRow } from "@/components/app/panels/settings/KeybindingRow";
import { SettingsCard, SettingsCardRow, SettingsSectionHeader } from "@/components/app/panels/settings/settingsUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Accelerator, KeybindingCommandId } from "@shared/types/keybindings/keybindings.types";
import { Keyboard } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export function KeybindingsSettingsSection() {
  const keybindings = useKeybindings();
  const updates = useKeybindingUpdates();
  const [query, setQuery] = useState("");
  const [recordingId, setRecordingId] = useState<KeybindingCommandId | null>(null);
  const groups = useMemo(() => buildKeybindingSettingsGroups(keybindings, query), [keybindings, query]);
  const { apply } = updates;

  const stopRecording = useCallback(() => setRecordingId(null), []);
  const saveRecorded = useCallback((accelerator: Accelerator) => {
    if (recordingId) apply({ kind: "set", commandId: recordingId, accelerator });
    setRecordingId(null);
  }, [apply, recordingId]);
  const recordingHint = useKeyChordRecorder({
    recording: recordingId !== null,
    platform: keybindings.platform,
    onRecorded: saveRecorded,
    onCancel: stopRecording
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <SettingsSectionHeader
          title="Keybindings"
          description="Click a shortcut and press the keys you want; Escape cancels. Changes apply right away and are saved to keybindings.json in your Nora config folder."
          icon={Keyboard}
        />
      </div>
      <SettingsCard label="Keybindings">
        <SettingsCardRow
          title="Reset all keybindings"
          description={keybindings.conflicts.length > 0
            ? <span role="status" className="text-destructive">{keybindings.conflicts.length === 1 ? "1 shortcut is" : `${keybindings.conflicts.length} shortcuts are`} bound to more than one command.</span>
            : "Restore every command to its default shortcut."}
          control={
            <Button type="button" variant="outline" size="sm" disabled={updates.saving || !hasKeybindingOverrides(keybindings)}
              onClick={() => { setRecordingId(null); apply({ kind: "reset-all" }); }}>
              Reset all
            </Button>
          }
        />
        <div className="px-5 py-3">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter commands or shortcuts" aria-label="Filter keybindings" />
        </div>
        {updates.error ? <p role="alert" className="px-5 py-3 text-sm text-destructive">{updates.error}</p> : null}
      </SettingsCard>
      {groups.length === 0 ? <p className="text-sm text-muted-foreground">No commands match “{query}”.</p> : null}
      {groups.map((group) => (
        <div key={group.category} className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">{group.category}</div>
          <SettingsCard label={`${group.category} keybindings`}>
            {group.rows.map((row) => (
              <KeybindingRow
                key={row.command.id}
                row={row}
                recording={recordingId === row.command.id}
                recordingHint={recordingId === row.command.id ? recordingHint : null}
                disabled={updates.saving}
                onRecord={() => { updates.clearError(); setRecordingId(row.command.id); }}
                onCancelRecording={stopRecording}
                onUnbind={() => apply({ kind: "set", commandId: row.command.id, accelerator: null })}
                onReset={() => apply({ kind: "reset", commandId: row.command.id })}
              />
            ))}
          </SettingsCard>
        </div>
      ))}
    </div>
  );
}
