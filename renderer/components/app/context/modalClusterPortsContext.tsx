import type { ModalClusterPorts } from "@/components/app/types/modalClusterPorts.types";
import { createContext, useContext, type ReactElement, type ReactNode } from "react";

const ModalClusterPortsContext = createContext<ModalClusterPorts | null>(null);

export const ModalClusterPortsProvider = ({
  value,
  children
}: {
  value: ModalClusterPorts;
  children: ReactNode;
}): ReactElement => <ModalClusterPortsContext.Provider value={value}>{children}</ModalClusterPortsContext.Provider>;

export const useOptionalModalClusterPorts = (): ModalClusterPorts | null => useContext(ModalClusterPortsContext);
