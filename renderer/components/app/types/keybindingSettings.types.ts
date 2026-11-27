import type { KeybindingSettingsRow } from "@/components/app/types/keybindings.types";

export type KeybindingRowProps = {
  row: KeybindingSettingsRow;
  recording: boolean;
  recordingHint: string | null;
  disabled: boolean;
  onRecord: () => void;
  onCancelRecording: () => void;
  onUnbind: () => void;
  onReset: () => void;
};
