import { formatThreadAge } from "@/components/app/logic/thread-workspace/threadAge";
import type { RemoteDeviceRow } from "@/components/app/types/remoteAccess.types";
import type { RemoteDevice } from "@shared/types/remote-access/remoteAccess.types";

/** Shapes the devices that reached this computer into list rows; the main process already sorts connected ones first. */
export function presentRemoteDevices(devices: readonly RemoteDevice[], now: number): RemoteDeviceRow[] {
  return devices.map((device) => {
    const age = formatThreadAge(device.lastSeenAt, now);
    const status = device.connected ? "Connected now" : !age || age.label === "now" ? "Active just now" : `Active ${age.label} ago`;
    return { id: device.id, label: device.label ?? "Unknown device", connected: device.connected, status };
  });
}
