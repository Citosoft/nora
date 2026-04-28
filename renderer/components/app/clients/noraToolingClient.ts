import type { ToolingGateway } from "@shared/ipc/types/toolingGateway.types";
import { createNoraClient, NORA_TOOLING_CLIENT_METHODS } from "./noraClientFactory";

export const noraToolingClient: ToolingGateway = createNoraClient(NORA_TOOLING_CLIENT_METHODS);
