import { Check, Cloud, CloudOff, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsSync } from "@/components/app/hooks/useSettingsSync";

export function SettingsSyncControls() {
  const { state, error, setEnabled, sync } = useSettingsSync();
  const syncing = state.phase === "syncing";
  return <section aria-label="Settings sync" className="space-y-2 border-t border-border pt-2">
    <Button variant="ghost" size="sm" className="w-full justify-start text-xs" aria-pressed={state.enabled} onClick={() => setEnabled(!state.enabled)}>
      {state.enabled ? <Cloud className="size-3.5" aria-hidden="true" /> : <CloudOff className="size-3.5" aria-hidden="true" />}Sync settings
      <span className="ml-auto text-muted-foreground">{state.enabled ? "On" : "Off"}</span>
    </Button>
    <p className="px-2 text-[11px] leading-relaxed text-muted-foreground">Appearance, preferences and thread defaults. Credentials and workspace data stay local.</p>
    {state.enabled && <div className="flex items-center justify-between gap-2 px-2"><span role="status" className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      {syncing ? <><LoaderCircle className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />Syncing…</>
        : state.phase === "pending" ? "Changes queued" : state.lastSyncedAt ? <><Check className="size-3" aria-hidden="true" />{state.phase === "error" ? "Changes kept locally" : "Synced"}</> : "Waiting to sync"}
    </span><Button variant="ghost" size="icon" className="size-6" aria-label="Sync now" disabled={syncing} onClick={sync}><RefreshCw className="size-3" aria-hidden="true" /></Button></div>}
    {(error || state.message) && <p role="alert" className="px-2 text-xs text-destructive">{error || state.message}</p>}
  </section>;
}
