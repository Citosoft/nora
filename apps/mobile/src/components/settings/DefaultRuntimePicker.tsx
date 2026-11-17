import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";
import { usePreferences } from "@/hooks/usePreferences";
import { useRuntimeDirectory } from "@/hooks/useRuntimeDirectory";

/** Which computer opens when the app starts. */
export function DefaultRuntimePicker() {
  const directory = useRuntimeDirectory();
  const { preferences, update } = usePreferences();
  const runtimes = directory.state.status === "ready" ? directory.state.value.runtimes : [];
  const choose = (runtimeId: string | null): void => void update((current) => ({ ...current, defaultRuntimeId: runtimeId }));
  return (
    <ListSection header="Open at launch" footer="Open this computer straight away when you start Nora.">
      <ListRow title="Computer list" accessory={preferences.defaultRuntimeId === null ? "checkmark" : "none"} onPress={() => choose(null)} />
      {runtimes.map((runtime) => (
        <ListRow key={runtime.installationId} title={runtime.name} accessory={preferences.defaultRuntimeId === runtime.installationId ? "checkmark" : "none"}
          onPress={() => choose(runtime.installationId)} />
      ))}
    </ListSection>
  );
}
