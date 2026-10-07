import type { ActiveLocalPort } from "@/components/app/types/activeLocalPort.types";

/** Footer ports readout; only available inside the signed-in shell where workspace navigation exists. */
export type StatusBarLocalPortsModel = {
  ports: ActiveLocalPort[];
  openTerminal: (port: ActiveLocalPort) => void;
  openInAppBrowser: (port: ActiveLocalPort) => void;
};
