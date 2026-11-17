import { useState } from "react";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { SettingRow } from "./settingsUi";
import { Select } from "@/components/ui/select";
import { idleCompactionModeSchema } from "@shared/personalization/contracts";

export function IdleCompactionSetting() {
  const { boot, request } = useNativeRuntimePorts();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <SettingRow title="Idle chat compaction"
    description="For large Claude chats (200k+ tokens) with a known cache lifetime. Automatic compaction summarizes earlier messages and uses tokens. It skips active work and approvals; Nora must be running."
    control={<div className="space-y-2">
      <Select aria-label="Idle chat compaction" className="w-full" disabled={busy} value={boot.personalization.idleCompaction ?? "suggest"}
        onChange={async (event) => {
          const mode = idleCompactionModeSchema.parse(event.target.value);
          setBusy(true); setError(null);
          try { await request({ kind: "set-idle-compaction", mode }); }
          catch (cause) { setError(cause instanceof Error ? cause.message : "Compaction preferences could not be saved."); }
          finally { setBusy(false); }
        }}>
        <option value="suggest">Suggest after cache expiry</option>
        <option value="before-expiry">Automatically compact before cache expiry</option>
        <option value="off">Off</option>
      </Select>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>} />;
}
