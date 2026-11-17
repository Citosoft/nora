import type { DirectContextBridge } from "@shared/ipc/types/directContextGateway.types";

export const directContextClient: DirectContextBridge = {
  preview: (input) => window.nora.directContext.preview(input)
};
