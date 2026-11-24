import { presentRemoteStatus } from "./presentation";
import { NORA_RELAY_NAME } from "@shared/remote-access/constants";
import type { MobileRemoteSetupStep } from "@/components/app/types/remoteAccess.types";
import type { RemoteAccessView } from "@shared/types/remote-access/remoteAccess.types";

/** Reduces the remote access view to the one next step the Mobile page offers. */
export function mobileRemoteSetupStep(view: RemoteAccessView | null): MobileRemoteSetupStep {
  if (!view) return { kind: "loading" };
  if (!view.enabled) return view.signedIn ? { kind: "enable" } : { kind: "sign-in" };
  const { label, detail } = presentRemoteStatus(view.status);
  switch (view.status.status) {
    case "connected": return { kind: "connected" };
    case "disabled": case "downloading": case "starting": case "reconnecting": return { kind: "starting", label, detail };
    case "paused": return view.status.reason === "signed-out" ? { kind: "sign-in" } : { kind: "attention", label, detail, recovery: "sign-in" };
    case "error": return { kind: "attention", label, detail, recovery: view.status.retryable ? "retry" : null };
  }
}

/** The status line under the Mobile page's setup action; empty while loading or once connected, where the page says more. */
export function mobileRemoteSetupMessage(step: MobileRemoteSetupStep): string {
  switch (step.kind) {
    case "loading": case "connected": return "";
    case "sign-in": return "Sign in to your Nora account to connect your phone.";
    case "enable": return `${NORA_RELAY_NAME} is off. Turn it on to reach this computer from your phone.`;
    case "starting": case "attention": return step.detail ? `${step.label} · ${step.detail}` : step.label;
  }
}
