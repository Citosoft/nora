import { useOptionalChangesColumnPorts } from "@/components/app/context/changesColumnPortsContext";
import type { ChangesColumnPorts } from "@/components/app/types/changesColumnPorts.types";

export const useChangesColumnPorts = (): ChangesColumnPorts => {
  const v = useOptionalChangesColumnPorts();
  if (!v) {
    throw new Error("useChangesColumnPorts must be used within ChangesColumnPortsProvider.");
  }
  return v;
};
