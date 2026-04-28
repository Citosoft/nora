import type { AppGateway } from "@shared/ipc/types/appGateway.types";
import { createNoraClient, NORA_APP_CLIENT_METHODS } from "./noraClientFactory";

export const noraAppClient: AppGateway = createNoraClient(NORA_APP_CLIENT_METHODS);
