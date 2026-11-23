import { useState } from "react";
import { CheckCircle2, Loader2, Settings2 } from "lucide-react";
import { accountClient } from "@/components/app/clients/accountClient";
import { mobileRemoteSetupMessage, mobileRemoteSetupStep } from "@/components/app/logic/remote-access/mobileSetup";
import type { MobileRemoteSetupProps } from "@/components/app/types/remoteAccess.types";
import { Button } from "@/components/ui/button";
import { MobileAppDownloadLinks } from "./MobileAppDownloadLinks";
import { MobileRemoteDevices } from "./MobileRemoteDevices";

/** The Mobile page's call to action: where to get the app, one button for the next setup step, then which computer to choose on the phone. */
export function MobileRemoteSetup({ controls, onOpenSettings }: MobileRemoteSetupProps) {
  const [signInError, setSignInError] = useState<string | null>(null);
  const step = mobileRemoteSetupStep(controls.view);
  const message = mobileRemoteSetupMessage(step);
  const runtimeName = controls.view?.runtime?.name ?? null;
  const error = signInError ?? (step.kind === "attention" && controls.error === step.detail ? null : controls.error);
  const signIn = (): void => {
    setSignInError(null);
    void accountClient.open().catch(() => setSignInError("Account sign-in could not open. Try again."));
  };
  const busy = (label: string) => <Button disabled><Loader2 className="size-4 animate-spin" aria-hidden="true" />{label}</Button>;
  const primary = (() => {
    switch (step.kind) {
      case "loading": return busy("Checking remote access…");
      case "sign-in": return <Button onClick={signIn}>Sign in to set up</Button>;
      case "enable": return <Button disabled={controls.pending} onClick={() => { void controls.request({ kind: "enable" }); }}>Enable remote access</Button>;
      case "starting": return busy(step.label);
      case "connected": return null;
      case "attention": return step.recovery === "retry" ? <Button disabled={controls.pending} onClick={() => { void controls.request({ kind: "retry" }); }}>Retry</Button>
        : step.recovery === "sign-in" ? <Button onClick={signIn}>Sign in</Button> : null;
    }
  })();
  return <section aria-label="Set up remote access" className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-4">
    {step.kind === "connected" ? <div className="space-y-1">
      <h2 className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />Remote access is on</h2>
      <p className="text-xs text-muted-foreground">Open Nora on your phone and sign in with the same account{runtimeName ? <>, then choose <span className="font-medium text-foreground">{runtimeName}</span></> : null}.</p>
    </div> : <div className="space-y-1">
      <h2 className="text-sm font-medium">Set up in under a minute</h2>
      <p className="text-xs text-muted-foreground">Install the app, turn on remote access here, then sign in on your phone with the same account. Only your account can connect, and this computer must stay on and online.</p>
    </div>}
    <MobileAppDownloadLinks />
    <div className="flex flex-wrap items-center gap-2">
      {primary}
      <Button variant="ghost" onClick={onOpenSettings}><Settings2 className="size-4" aria-hidden="true" />Remote access settings</Button>
    </div>
    <p role="status" aria-live="polite" className={`text-sm ${step.kind === "attention" ? "text-destructive" : "text-muted-foreground"} ${message ? "" : "sr-only"}`}>{message}</p>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {controls.view?.enabled ? <MobileRemoteDevices devices={controls.view.devices} pending={controls.pending}
      onDisconnect={(deviceId) => { void controls.request({ kind: "disconnect-device", deviceId }); }} /> : null}
  </section>;
}
