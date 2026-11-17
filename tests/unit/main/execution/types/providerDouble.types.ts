import type { ProviderExecution, EmitProviderUpdate } from "@main/types/execution/provider.types";

export interface DoubleExecution extends ProviderExecution {
  emit: EmitProviderUpdate;
  release: () => void;
}
