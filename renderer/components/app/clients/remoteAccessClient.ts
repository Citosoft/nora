import type { RemoteAccessBridge } from "@shared/ipc/types/remoteAccessGateway.types";

export const remoteAccessClient: RemoteAccessBridge = {
  request: (input) => window.nora.remoteAccess.request(input),
  activity: (limit) => window.nora.remoteAccess.activity(limit),
  onChanged: (listener) => window.nora.remoteAccess.onChanged(listener)
};
