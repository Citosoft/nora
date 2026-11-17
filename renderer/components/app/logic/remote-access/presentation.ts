import { remoteAccessStatusLabel } from "@shared/remote-access/statusLabel";
import { runtimeNameSchema } from "@shared/remote-access/directory";
import type { RemoteAccessStatus, RemoteAuditEntry } from "@shared/types/remote-access/remoteAccess.types";
import type { StatusPresentation } from "@/components/app/types/remoteAccess.types";

export function presentRemoteStatus(status: RemoteAccessStatus): StatusPresentation {
  const label = remoteAccessStatusLabel(status);
  switch (status.status) {
    case "disabled": case "starting": return { label, detail: null, tone: "normal" };
    case "connected": return { label, detail: null, tone: "success" };
    case "downloading": return { label, detail: status.progress === null ? null : `${Math.round(status.progress * 100)}%`, tone: "normal" };
    case "reconnecting": case "error": return { label, detail: status.message, tone: "warning" };
    case "paused": return { label, detail: "Sign in with the account that set this up.", tone: "warning" };
  }
}

export function validateRuntimeName(name: string): string | null {
  return runtimeNameSchema.safeParse(name.trim()).success ? null : "Enter a name between 1 and 64 characters.";
}

const ACTIONS: Record<RemoteAuditEntry["action"], string> = {
  "create-conversation": "Created a conversation",
  "send-message": "Sent a message",
  "decide-action": "Answered an approval or question",
  "cancel-task": "Cancelled a task"
};
export function formatRemoteActivity(entry: RemoteAuditEntry): string {
  return `${ACTIONS[entry.action]} · ${entry.outcome === "accepted" ? "Accepted" : "Rejected"}`;
}
