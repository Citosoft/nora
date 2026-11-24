import type { ConnectedRuntime } from "@/types/runtimeSession.types";
import { capabilityGate } from "@/state/runtimeCompatibility";
import { Banner } from "@/components/common/Banner";
import { Inset } from "@/components/common/Inset";
import { ThreadPreferences } from "./ThreadPreferences";
import { BotSettings } from "./BotSettings";

export function ComputerSettings({ runtime }: { runtime: ConnectedRuntime }) {
  const info = runtime.snapshot.info.status === "ready" ? runtime.snapshot.info.value : null;
  const settings = capabilityGate(info, "settings.manage");
  const bots = capabilityGate(info, "bots.manage");
  return <>
    {settings.enabled ? <ThreadPreferences session={runtime.session} />
      : <Inset><Banner tone="neutral" title="Computer settings" message={settings.reason} /></Inset>}
    {bots.enabled ? <BotSettings session={runtime.session} />
      : <Inset><Banner tone="neutral" title="Bot management" message={bots.reason} /></Inset>}
  </>;
}
