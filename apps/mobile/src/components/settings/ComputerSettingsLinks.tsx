import { router } from "expo-router";
import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";
import { useRuntimeDirectory } from "@/hooks/useRuntimeDirectory";
import { routes } from "@/navigation/routes";

export function ComputerSettingsLinks() {
  const { state } = useRuntimeDirectory();
  const runtimes = state.status === "ready" ? state.value.runtimes : [];
  if (!runtimes.length) return null;
  return <ListSection header="Computer settings & bots" footer="Changes are saved on the computer you choose.">
    {runtimes.map((runtime) => <ListRow key={runtime.installationId} title={runtime.name} accessory="chevron"
      onPress={() => router.push(routes.runtimeSettings(runtime.installationId))} />)}
  </ListSection>;
}
