import type { RemoteAccessViewRequest } from "@shared/ipc/types/remoteAccessGateway.types";
import type { RemoteAccessView, RemoteAuditEntry } from "@shared/types/remote-access/remoteAccess.types";

export interface RemoteAccessControls {
  view: RemoteAccessView | null;
  activity: RemoteAuditEntry[];
  pending: boolean;
  error: string | null;
  activityError: string | null;
  request(input: RemoteAccessViewRequest): Promise<boolean>;
  refreshActivity(): Promise<void>;
}

export interface StatusPresentation {
  label: string;
  detail: string | null;
  tone: "normal" | "success" | "warning";
}
