import type { ForgeService, SessionService, SnapshotService, ToolingService, WorkspaceService } from "../../types/mainServices.types";
import type { DomainMainServicesBundle } from "./orchestratorMainServiceAssembly.types";

export const buildDomainMainServicesFromOrchestrator = (
  snapshot: SnapshotService,
  workspace: WorkspaceService,
  session: SessionService,
  tooling: ToolingService,
  forge: ForgeService
): DomainMainServicesBundle => ({
  snapshot,
  workspace,
  session,
  tooling,
  forge
});
