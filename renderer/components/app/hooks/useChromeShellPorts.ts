import { useOptionalChromeShellPorts } from "@/components/app/context/chromeShellPortsContext";
import type { ChromeShellPorts } from "@/components/app/types/chromeShellPorts.types";

export const useChromeShellPorts = (): ChromeShellPorts => {
  const v = useOptionalChromeShellPorts();
  if (!v) {
    throw new Error("useChromeShellPorts must be used within ChromeShellPortsProvider.");
  }
  return v;
};
