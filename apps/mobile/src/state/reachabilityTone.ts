import type { StatusTone } from "@/types/conversationState.types";
import type { RuntimeReachability } from "@/types/reachability.types";

/** Status colour for a computer: green when online and compatible, amber when it needs an update, red when unreachable. */
export function reachabilityTone(reachability: RuntimeReachability): StatusTone {
  if (reachability.status === "online") return reachability.compatible ? "success" : "attention";
  return reachability.status === "checking" ? "neutral" : "danger";
}
