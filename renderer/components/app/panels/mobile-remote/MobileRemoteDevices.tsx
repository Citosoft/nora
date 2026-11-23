import { useMemo } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThreadTime } from "@/components/app/hooks/useThreadTime";
import { presentRemoteDevices } from "@/components/app/logic/remote-access/devices";
import type { MobileRemoteDevicesProps } from "@/components/app/types/remoteAccess.types";

/**
 * Devices signed in to this computer since remote access started, with whether each is connected now.
 * Disconnect refuses that device until it signs in to Nora again; the others stay connected.
 */
export function MobileRemoteDevices({ devices, pending, onDisconnect }: MobileRemoteDevicesProps) {
  const now = useThreadTime();
  const rows = useMemo(() => presentRemoteDevices(devices, now), [devices, now]);
  return <section aria-labelledby="mobile-remote-devices" className="space-y-1.5 border-t border-border/60 pt-3">
    <h3 id="mobile-remote-devices" className="text-xs font-medium text-muted-foreground">Connected devices</h3>
    {rows.length ? <ul className="space-y-1">
      {rows.map((row) => <li key={row.id} className="flex items-center gap-2 text-sm">
        <Smartphone className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{row.label}</span>
        <span className={`flex shrink-0 items-center gap-1.5 text-xs ${row.connected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
          {row.connected && <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />}{row.status}</span>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-destructive" disabled={pending}
          aria-label={`Disconnect ${row.label}`} tooltip="Disconnect until this device signs in to Nora again" onClick={() => onDisconnect(row.id)}>Disconnect</Button>
      </li>)}
    </ul> : <p className="text-xs text-muted-foreground">None yet. Devices appear here once they sign in.</p>}
  </section>;
}
