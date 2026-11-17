import type { NativeInstance } from "@main/types/execution/localHost.types";
import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";

/** An installed runtime: what the execution host registers and what personalization offers the renderer. */
export interface NativeProviderDiscovery {
  instance: NativeInstance;
  provider: NativeProvider;
}
