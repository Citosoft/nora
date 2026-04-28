import type { ChromeShellPorts } from "@/components/app/types/chromeShellPorts.types";
import { createContext, useContext, type ReactElement, type ReactNode } from "react";

const ChromeShellPortsContext = createContext<ChromeShellPorts | null>(null);

export const ChromeShellPortsProvider = ({
  value,
  children
}: {
  value: ChromeShellPorts;
  children: ReactNode;
}): ReactElement => <ChromeShellPortsContext.Provider value={value}>{children}</ChromeShellPortsContext.Provider>;

export const useOptionalChromeShellPorts = (): ChromeShellPorts | null => useContext(ChromeShellPortsContext);
