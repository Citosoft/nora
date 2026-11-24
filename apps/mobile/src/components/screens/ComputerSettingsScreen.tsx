import { RuntimeScreen } from "@/components/runtimes/RuntimeScreen";
import { ComputerSettings } from "@/components/settings/ComputerSettings";
import { routes } from "@/navigation/routes";

export function ComputerSettingsScreen({ runtimeId }: { runtimeId: string }) {
  return <RuntimeScreen runtimeId={runtimeId} title={() => "Settings & bots"} subtitle={(runtime) => runtime.name}
    back={{ fallbackHref: routes.settings, label: "Settings" }}>
    {(runtime) => <ComputerSettings runtime={runtime} />}
  </RuntimeScreen>;
}
