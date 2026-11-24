import { NoraRelayLinkAnimation } from "@/components/app/shared/NoraRelayLinkAnimation";

/** Signed-out avatar hover card: what signing in unlocks. */
export function SignInRelayHint() {
  return <span className="block w-56 space-y-1.5">
    <NoraRelayLinkAnimation active />
    <strong className="block font-bold">Sign in for remote control</strong>
    <span className="block text-muted-foreground">Control Nora from your phone with Nora Relay, and sync your settings across devices.</span>
  </span>;
}
