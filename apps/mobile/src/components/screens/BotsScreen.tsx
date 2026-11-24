import type { BotsScreenProps } from "@/types/botSettings.types";
import { capabilityGate } from "@/state/runtimeCompatibility";
import { RuntimeScreen } from "@/components/runtimes/RuntimeScreen";
import { BotSettings } from "@/components/settings/BotSettings";
import { Inset } from "@/components/common/Inset";
import { Banner } from "@/components/common/Banner";
import { routes } from "@/navigation/routes";

export function BotsScreen({ runtimeId, intent }: BotsScreenProps) {
  return <RuntimeScreen runtimeId={runtimeId} title={() => "Bots"} subtitle={(runtime) => runtime.name}
    back={{ label: "Chat", fallbackHref: routes.runtime(runtimeId) }}>
    {(runtime) => {
      const info = runtime.snapshot.info.status === "ready" ? runtime.snapshot.info.value : null;
      const gate = capabilityGate(info, "bots.manage");
      return gate.enabled ? <BotSettings key={JSON.stringify(intent)} session={runtime.session} intent={intent} />
        : <Inset><Banner tone="neutral" title="Bot management" message={gate.reason} /></Inset>;
    }}
  </RuntimeScreen>;
}
