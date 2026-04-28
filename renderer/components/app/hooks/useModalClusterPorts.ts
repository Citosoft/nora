import { useOptionalModalClusterPorts } from "@/components/app/context/modalClusterPortsContext";
import type { ModalClusterPorts } from "@/components/app/types/modalClusterPorts.types";

export const useModalClusterPorts = (): ModalClusterPorts => {
  const v = useOptionalModalClusterPorts();
  if (!v) {
    throw new Error("useModalClusterPorts must be used within ModalClusterPortsProvider.");
  }
  return v;
};
