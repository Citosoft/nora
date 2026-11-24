import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRemoteAccess } from "@/components/app/hooks/useRemoteAccess";
import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { accountClient } from "@/components/app/clients/accountClient";
import { presentRemoteStatus } from "@/components/app/logic/remote-access/presentation";
import { NORA_RELAY_NAME } from "@shared/remote-access/constants";
import { SettingsCard, SettingsCardRow, SettingsSwitch } from "./settingsUi";
import { RemoteActivityCard } from "./RemoteActivityCard";
import { MobileAppInstallRows } from "./MobileAppInstallRows";
import { RemotePhoneLinkActions } from "./RemotePhoneLinkActions";
import { RemoteRuntimeHeader } from "./RemoteRuntimeHeader";
import { NoraRelayLinkAnimation } from "@/components/app/shared/NoraRelayLinkAnimation";

const STATUS_TONE_CLASS = { normal: "", success: "text-emerald-500", warning: "text-destructive" } as const;

export function RemoteAccessSettingsSection() {
  const controls = useRemoteAccess();
  const { appSettings, updateLifecycle } = useSettingsRuntime();
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const view = controls.view;
  const status = view ? presentRemoteStatus(view.status) : null;
  const actionError = (controls.error !== status?.detail ? controls.error : null) ?? localError;
  const keepRunning = !!view?.enabled || appSettings.lifecycle.keepRunningInBackground;
  const saveLifecycle = (patch: Partial<typeof appSettings.lifecycle>) => {
    setSaving(true); setLocalError(null);
    void updateLifecycle({ ...appSettings.lifecycle, ...patch }).catch((cause: unknown) => {
      setLocalError(cause instanceof Error ? cause.message : "Could not save lifecycle settings.");
    }).finally(() => setSaving(false));
  };
  return <div className="max-w-4xl space-y-6">
    <RemoteRuntimeHeader controls={controls} />
    <SettingsCard label={NORA_RELAY_NAME}>
      <SettingsCardRow title={`Enable ${NORA_RELAY_NAME}`} description={<span role="status" aria-live="polite" className={STATUS_TONE_CLASS[status?.tone ?? "normal"]}>{status?.label ?? `Loading ${NORA_RELAY_NAME}…`}{status?.detail ? ` · ${status.detail}` : ""}</span>}
        control={<>
          {(!view && controls.error) || view?.status.status === "error" ? <Button variant="outline" size="sm" disabled={controls.pending} onClick={() => { void controls.request({ kind: view ? "retry" : "view" }); }}>Retry</Button> : null}
          <SettingsSwitch checked={view?.enabled ?? false} disabled={!view || controls.pending || (!view.signedIn && !view.enabled)} accessibleName={`Enable ${NORA_RELAY_NAME}`} onChange={(enabled) => { void controls.request({ kind: enabled ? "enable" : "disable" }); }} />
        </>} />
      <div className="flex items-center gap-4 px-5 py-3">
        <NoraRelayLinkAnimation active={view?.status.status === "connected"} className="w-40 shrink-0" />
        <p className="text-xs leading-5 text-muted-foreground">Makes an authenticated Nora endpoint reachable through Cloudflare, which carries and can see the traffic. Only your Nora account can use it, and this computer must stay on, awake and online.</p>
      </div>
      {view && !view.signedIn ? <SettingsCardRow title="Nora account" description={`Sign in to your Nora account to enable ${NORA_RELAY_NAME}.`}
        control={<Button variant="outline" size="sm" onClick={() => { void accountClient.open().catch((cause: unknown) => setLocalError(cause instanceof Error ? cause.message : "Could not open sign in.")); }}>Sign in</Button>} /> : null}
      <MobileAppInstallRows onError={setLocalError} />
      {view ? <SettingsCardRow title="Open on phone" description={<span className="break-all">{view.webAppUrl}</span>} control={<RemotePhoneLinkActions url={view.webAppUrl} onError={setLocalError} />} /> : null}
      {view?.pendingCleanup ? <p className="px-5 py-3 text-sm text-muted-foreground">{NORA_RELAY_NAME} is stopped locally. Online registration cleanup is pending and will be retried when connectivity returns.</p> : null}
      {actionError ? <p role="alert" className="px-5 py-3 text-sm text-destructive">{actionError}</p> : null}
    </SettingsCard>
    <SettingsCard label="Background">
      <SettingsCardRow title="Keep Nora running in the background" description={view?.enabled ? `Required while ${NORA_RELAY_NAME} is on.` : "Closing the window keeps agents running. Use Quit Nora to stop them."}
        control={<SettingsSwitch checked={keepRunning} disabled={!!view?.enabled || saving} accessibleName="Keep Nora running in the background" onChange={(keepRunningInBackground) => saveLifecycle({ keepRunningInBackground })} />} />
      <SettingsCardRow title="Launch at login" description="Start Nora when you sign in, hidden when background mode is on."
        control={<SettingsSwitch checked={appSettings.lifecycle.launchAtLogin} disabled={saving} accessibleName="Launch at login" onChange={(launchAtLogin) => saveLifecycle({ launchAtLogin })} />} />
    </SettingsCard>
    <RemoteActivityCard controls={controls} />
  </div>;
}
