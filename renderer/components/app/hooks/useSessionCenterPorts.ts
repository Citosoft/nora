import { useOptionalSessionCenterPorts } from "@/components/app/context/sessionCenterPortsContext";
import type { SessionCenterPorts } from "@/components/app/types/sessionCenterPorts.types";

export const useSessionCenterPorts = (): SessionCenterPorts => {
  const v = useOptionalSessionCenterPorts();
  if (!v) {
    throw new Error("useSessionCenterPorts must be used within SessionCenterPortsProvider.");
  }
  return v;
};
