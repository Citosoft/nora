import { useMemo } from "react";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useRuntimeMcpCatalog } from "@/components/app/hooks/useRuntimeMcpCatalog";
import { botAccountConnectorsFrom } from "@/components/app/logic/botAccountConnectors";
import type { BotAccountConnectorsState } from "@/components/app/types/botEditor.types";
import type { McpProviderSource } from "@/components/app/types/runtimeMcp.types";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";

const NO_SOURCES: readonly McpProviderSource[] = [];

/** Lists the account connectors of the runtime a bot runs on; account connectors are global, so no workspace is involved. */
export function useRuntimeAccountConnectors(model: ThreadModelDefault | null): BotAccountConnectorsState {
  const { boot, store } = useNativeRuntimePorts();
  const provider = model ? boot.providers.find((entry) => entry.kind === model.kind && entry.instanceId === model.instanceId && entry.reportsMcp) : undefined;
  const sources = useMemo<readonly McpProviderSource[]>(() => provider ? [{ key: `${provider.kind}:${provider.instanceId}`, label: provider.label, kind: provider.kind,
    selection: { environmentId: boot.environmentId, providerKind: provider.kind, instanceId: provider.instanceId } }] : NO_SOURCES,
  [boot.environmentId, provider]);
  const { entries } = useRuntimeMcpCatalog(store.client, sources);
  const entry = entries[0];
  return useMemo(() => entry ? botAccountConnectorsFrom(entry.state) : { status: "unsupported" }, [entry]);
}
