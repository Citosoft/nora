import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRemoteAccess } from "@/components/app/hooks/useRemoteAccess";
import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { accountClient } from "@/components/app/clients/accountClient";
import { presentRemoteStatus, formatRemoteActivity } from "@/components/app/logic/remote-access/presentation";
import { SettingRow, SettingsSectionHeader, ToggleButton } from "./settingsUi";
import { RemotePhoneLink } from "./RemotePhoneLink";
import { RemoteRuntimeName } from "./RemoteRuntimeName";

export function RemoteAccessSettingsSection() {
  const controls = useRemoteAccess();
  const { appSettings, updateLifecycle } = useSettingsRuntime();
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const view = controls.view;
  const status = view ? presentRemoteStatus(view.status) : null;
  const actionError = (controls.error !== status?.detail ? controls.error : null) ?? localError;
  const saveLifecycle = (patch: Partial<typeof appSettings.lifecycle>) => {
    setSaving(true); setLocalError(null);
    void updateLifecycle({ ...appSettings.lifecycle, ...patch }).catch((cause: unknown) => {
      setLocalError(cause instanceof Error ? cause.message : "Could not save lifecycle settings.");
    }).finally(() => setSaving(false));
  };
  return <div className="max-w-4xl">
    <SettingsSectionHeader title="Remote access" description="Use Nora from your phone while this computer runs your tasks." icon={Globe} />
    <SettingRow title="Enable remote access" description="Enabling makes an authenticated Nora endpoint reachable from the internet through Cloudflare. Only your Nora account can use it. Cloudflare carries the traffic and can see it. Your computer must be on, awake and online. Closing the window keeps Nora running in the tray or menu bar (minimised on Linux)."
      control={<ToggleButton checked={view?.enabled ?? false} disabled={!view || controls.pending || (!view.signedIn && !view.enabled)} accessibleName="Enable remote access" label={view?.enabled ? "Enabled" : "Disabled"} onChange={(enabled) => { void controls.request({ kind: enabled ? "enable" : "disable" }); }} />} />
    {view && !view.signedIn ? <div className="space-y-2 py-3"><p className="text-sm text-muted-foreground">Sign in to your Nora account to enable remote access.</p><Button variant="outline" onClick={() => { void accountClient.open().catch((cause: unknown) => setLocalError(cause instanceof Error ? cause.message : "Could not open sign in.")); }}>Sign in</Button></div> : null}
    <div role="status" aria-live="polite" className={`py-3 text-sm ${status?.tone === "warning" ? "text-destructive" : "text-muted-foreground"}`}>
      {status?.label ?? "Loading remote access…"}{status?.detail ? ` · ${status.detail}` : ""}
    </div>
    {actionError ? <p role="alert" className="py-2 text-sm text-destructive">{actionError}</p> : null}
    {(!view && controls.error) || view?.status.status === "error" ? <Button variant="outline" disabled={controls.pending} onClick={() => { void controls.request({ kind: view ? "retry" : "view" }); }}>Retry</Button> : null}
    {view?.pendingCleanup ? <p className="py-3 text-sm text-muted-foreground">Remote access is stopped locally. Online registration cleanup is pending and will be retried when connectivity returns.</p> : null}
    {view?.runtime ? <SettingRow title="Runtime name" description="The name shown when you choose this computer on another device." control={<RemoteRuntimeName controls={controls} />} /> : null}
    {view ? <SettingRow title="Open on phone" description="Sign in with the same Nora account on your phone." control={<RemotePhoneLink url={view.webAppUrl} />} /> : null}
    {view?.enabled ? <SettingRow title="Reset connection" description="Replace connector credentials and disconnect existing remote sessions."
      control={<Dialog.Root open={resetOpen} onOpenChange={setResetOpen}>
        <Dialog.Trigger asChild><Button variant="outline" disabled={controls.pending}>Reset connection</Button></Dialog.Trigger>
        <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/80" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-lg border border-border bg-card p-6 shadow-panel">
            <Dialog.Title className="font-semibold">Reset remote connection?</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">Existing remote sessions will disconnect. Your conversations remain on this computer.</Dialog.Description>
            <div className="flex justify-end gap-2"><Dialog.Close asChild><Button variant="outline" disabled={controls.pending}>Cancel</Button></Dialog.Close><Button disabled={controls.pending} onClick={() => { void controls.request({ kind: "rotate" }).then((ok) => { if (ok) setResetOpen(false); }); }}>Reset connection</Button></div>
            {controls.error ? <p role="alert" className="text-sm text-destructive">{controls.error}</p> : null}
          </Dialog.Content></Dialog.Portal>
      </Dialog.Root>} /> : null}
    <SettingRow title="Keep Nora running in the background" description={view?.enabled ? "Required while remote access is on" : "Closing the window keeps agents running. Use Quit Nora to stop them."}
      control={<ToggleButton checked={!!view?.enabled || appSettings.lifecycle.keepRunningInBackground} disabled={!!view?.enabled || saving} accessibleName="Keep Nora running in the background" label={view?.enabled || appSettings.lifecycle.keepRunningInBackground ? "Enabled" : "Disabled"} onChange={(keepRunningInBackground) => saveLifecycle({ keepRunningInBackground })} />} />
    <SettingRow title="Launch at login" description="Start Nora when you sign in to this computer. It starts hidden when background mode is enabled."
      control={<ToggleButton checked={appSettings.lifecycle.launchAtLogin} disabled={saving} accessibleName="Launch at login" label={appSettings.lifecycle.launchAtLogin ? "Enabled" : "Disabled"} onChange={(launchAtLogin) => saveLifecycle({ launchAtLogin })} />} />
    <section className="space-y-3 py-5" aria-label="Recent remote activity"><div className="flex items-center justify-between"><h3 className="text-sm font-medium">Recent remote activity</h3><Button variant="outline" size="sm" onClick={() => { void controls.refreshActivity(); }}>Refresh</Button></div>
      {controls.activityError ? <p role="alert" className="text-sm text-destructive">{controls.activityError}</p> : null}
      <ul className="space-y-2 text-sm text-muted-foreground">{controls.activity.map((entry, index) => <li key={`${entry.at}-${index}`}><time dateTime={entry.at}>{new Date(entry.at).toLocaleString()}</time> · {formatRemoteActivity(entry)}</li>)}</ul>
      {!controls.activity.length && !controls.activityError ? <p className="text-sm text-muted-foreground">No recent remote activity.</p> : null}
    </section>
  </div>;
}
