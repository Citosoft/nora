import type { AppsBridge } from "@shared/ipc/types/appsGateway.types";

export const appsClient: AppsBridge = {
  onInstallRequested: (listener) => window.nora.apps.onInstallRequested(listener),
  request: (input) => window.nora.apps.request(input),
  onChanged: (listener) => window.nora.apps.onChanged(listener),
  onData: (listener) => window.nora.apps.onData(listener),
  onBuildStep: (listener) => window.nora.apps.onBuildStep(listener)
};
