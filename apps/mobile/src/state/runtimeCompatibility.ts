import { REMOTE_API_VERSION } from "@shared/remote-access/constants";
import type { RuntimeCapability, RuntimeInfo } from "@shared/types/remote-access/runtimeApi.types";
import type { CapabilityGate, RuntimeCompatibility } from "@/types/runtimeSession.types";

/** The capability handshake: an API version mismatch disables everything; a missing capability disables its feature. */
export function evaluateCompatibility(info: RuntimeInfo): RuntimeCompatibility {
  if (info.apiVersion > REMOTE_API_VERSION) {
    return { compatible: false, message: "This computer runs a newer version of Nora. Reload this page (or update the app) to use it." };
  }
  if (info.apiVersion < REMOTE_API_VERSION) {
    return { compatible: false, message: "This computer runs an older version of Nora. Update Nora Desktop on it to connect." };
  }
  return { compatible: true, message: null };
}

const capabilityExplanations: Record<RuntimeCapability, string> = {
  "conversations.read": "This computer's Nora can't share conversations remotely yet.",
  "conversations.create": "Starting new conversations remotely needs a newer Nora Desktop.",
  "messages.send": "Sending messages remotely needs a newer Nora Desktop.",
  "actions.decide": "Approving actions remotely needs a newer Nora Desktop. Approve them on the computer instead.",
  "tasks.cancel": "Stopping tasks remotely needs a newer Nora Desktop.",
  "tasks.list": "The activity list needs a newer Nora Desktop.",
  "events.replay": "Catching up on missed updates needs a newer Nora Desktop; the app reloads instead.",
  "bots.chat": "Chatting with bots remotely needs a newer Nora Desktop.",
  "inbox.read": "The full inbox needs a newer Nora Desktop; only approvals and questions show here.",
  "inbox.update": "Marking inbox items read or done needs a newer Nora Desktop.",
  realtime: "Live updates need a newer Nora Desktop. Pull to refresh to see changes."
};

export function capabilityGate(info: RuntimeInfo | null, capability: RuntimeCapability): CapabilityGate {
  if (!info) return { enabled: false, reason: "Connecting to your computer…" };
  const compatibility = evaluateCompatibility(info);
  if (!compatibility.compatible) return { enabled: false, reason: compatibility.message };
  return info.capabilities.includes(capability) ? { enabled: true, reason: null } : { enabled: false, reason: capabilityExplanations[capability] };
}
