import type { SystemGateway } from "@shared/ipc/types/systemGateway.types";
import { createNoraClient, NORA_SYSTEM_CLIENT_METHODS } from "./noraClientFactory";

export const noraSystemClient: SystemGateway = createNoraClient(NORA_SYSTEM_CLIENT_METHODS);
