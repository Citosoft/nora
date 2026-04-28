import type { AppBridge } from "./appGateway.types";
import type { IntegrationBridge } from "./integrationGateway.types";
import type { SessionBridge } from "./sessionGateway.types";
import type { SystemBridge } from "./systemGateway.types";
import type { ToolingBridge } from "./toolingGateway.types";
import type { WorkspaceBridge } from "./workspaceGateway.types";

export interface NoraBridge
  extends AppBridge,
    IntegrationBridge,
    SessionBridge,
    SystemBridge,
    ToolingBridge,
    WorkspaceBridge {}
