import { LoaderCircle, MoreHorizontal } from "lucide-react";
import type { NoraConnectorActionsProps, NoraConnectorMenuItem } from "@/components/app/types/noraConnectors.types";
import { Button } from "@/components/ui/button";
import { NoraConnectorMenu } from "./NoraConnectorMenu";

/** A connector's primary action (sign in while one is needed, or the sign-in waiting on the browser) and, optionally, a menu for everything else. */
export function NoraConnectorActions({ connector, controls, compact = false, menu = true, onEditAccess }: NoraConnectorActionsProps) {
  const pending = controls.pending(connector.id);
  const failure = controls.failure(connector.id);
  const oauth = connector.auth.kind === "oauth";
  const size = compact ? "h-6 px-2 text-[10px]" : "";
  const primary = pending === "sign-in"
    ? <span role="status" className={`inline-flex shrink-0 items-center gap-1 text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>
      <LoaderCircle className="size-3 motion-safe:animate-spin" aria-hidden="true" />Finish in browser…</span>
    : oauth && connector.enabled && connector.status === "needs-auth"
    ? <Button variant="outline" size="sm" className={`shrink-0 ${size}`} title={failure} disabled={!!pending}
      onClick={() => controls.signIn(connector.id)} aria-label={`${failure ? "Retry sign-in to" : "Sign in to"} ${connector.name}`}>{failure ? "Retry sign-in" : "Sign in"}</Button>
    : null;
  if (!menu) return primary;
  const busy = !!pending && pending !== "sign-in";
  const items: NoraConnectorMenuItem[] = [
    ...(oauth && connector.enabled && connector.status !== "needs-auth" ? [{ label: "Sign in again", run: () => controls.signIn(connector.id) }] : []),
    ...(connector.auth.kind === "oauth" && connector.auth.signedIn ? [{ label: "Sign out", run: () => controls.signOut(connector.id) }] : []),
    ...(connector.enabled ? [{ label: "Check connection", run: () => controls.refresh(connector.id) }] : []),
    ...(onEditAccess ? [{ label: "Choose where it's available…", run: () => onEditAccess(connector) }] : []),
    { label: connector.enabled ? "Disable for threads" : "Enable for threads", run: () => controls.setEnabled(connector.id, !connector.enabled) },
    { label: "Remove", run: () => controls.remove(connector.id), destructive: true }
  ];
  return <div className="flex items-center justify-end gap-1.5">
    {primary}
    <NoraConnectorMenu label={`More actions for ${connector.name}`} busy={busy} items={items}
      icon={busy ? <LoaderCircle className="size-3.5 motion-safe:animate-spin" aria-hidden="true" /> : <MoreHorizontal className="size-3.5" aria-hidden="true" />} />
  </div>;
}

