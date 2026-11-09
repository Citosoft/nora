import type { z } from "zod";
import type { providerUpdateSchema } from "@main/execution/providerUpdateSchema";
import type { ConversationRun, ProviderBinding, RequestResponse, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { ExecutionState } from "./store.types";
import type { ProviderCapabilities } from "@shared/types/provider/capabilities.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";

export type ProviderUpdate = z.infer<typeof providerUpdateSchema>;
export type EmitProviderUpdate = (update: ProviderUpdate) => void;
export interface ProviderExecution {
  snapshot: ExecutionState;
  run: ConversationRun;
}
export interface ExecutionProvider {
  readonly kind: ProviderBinding["kind"];
  readonly instanceId: string;
  readonly capabilities: ProviderCapabilities;
  catalog(workspace: WorkspaceRef): Promise<ProviderCatalogResult>;
  close(): Promise<void>;
  start(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void>;
  interrupt(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void>;
  respond(execution: ProviderExecution, request: RuntimeRequest, response: RequestResponse, emit: EmitProviderUpdate): Promise<void>;
  reconcile(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void>;
}
export interface ProviderResolver {
  resolve(kind: ExecutionProvider["kind"], instanceId: string): ExecutionProvider;
}
