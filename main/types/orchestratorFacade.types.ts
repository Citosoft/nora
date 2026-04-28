import type { AppState } from "@shared/appTypes";
import type { MainServices } from "./mainServices.types";

export interface OrchestratorFacade {
  createServices: () => MainServices;
  onStateChanged: (listener: (state: AppState) => void) => () => void;
  onAgentTerminalData: (listener: (sessionId: string, data: string) => void) => () => void;
  initialize: () => Promise<AppState>;
}
