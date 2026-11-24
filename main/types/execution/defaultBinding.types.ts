import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";
import type { ProviderCatalog, ProviderCatalogResult } from "@shared/types/provider/catalog.types";

/** What picking a new thread's provider and model reads: the installed providers, their catalogs and the saved defaults. */
export interface DefaultBindingInput {
  providers: readonly NativeProvider[];
  catalog(kind: ProviderBinding["kind"], instanceId: string, workspace: WorkspaceRef): Promise<ProviderCatalogResult>;
  preferred: ThreadModelDefault | null;
  subagentModel: ThreadModelDefault | null;
}
export type DefaultBindingResult = { ok: true; binding: ProviderBinding; catalog: ProviderCatalog } | { ok: false; message: string };
