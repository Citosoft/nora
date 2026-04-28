import type { SessionGateway } from "@shared/ipc/types/sessionGateway.types";
import { createNoraClient, NORA_SESSION_CLIENT_METHODS } from "./noraClientFactory";

export const noraSessionClient: SessionGateway = createNoraClient(NORA_SESSION_CLIENT_METHODS);
