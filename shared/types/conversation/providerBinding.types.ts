import type { ProviderBinding } from "./contracts.types";
import type { ProviderKind } from "@shared/types/provider/providerKind.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";

export interface ProviderBindingInput {
  /** Only the provider's identity matters for binding; MCP reporting and labels do not. */
  provider: { kind: ProviderKind; instanceId: string } | null;
  catalog: ProviderCatalogResult;
  modelId: string | null;
  policyId: string | null;
  reasoning: string | null;
  /** Default subagent model, or null for the runtime's own default. */
  subagentModel: string | null;
  locked: ProviderBinding | null;
}

export type ProviderBindingResolution = { status: "ready"; binding: ProviderBinding } | { status: "blocked"; message: string | null };
