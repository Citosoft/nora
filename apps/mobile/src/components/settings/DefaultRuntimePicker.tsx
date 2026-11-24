import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";
import { usePreferences } from "@/hooks/usePreferences";
import { useRuntimeDirectory } from "@/hooks/useRuntimeDirectory";

/** Whether the app opens on the dashboard or straight into one computer. */
export function DefaultRuntimePicker() {
  const directory = useRuntimeDirectory();
  const { preferences, update } = usePreferences();
  const runtimes = directory.state.status === "ready" ? directory.state.value.runtimes : [];
  const choose = (runtimeId: string | null): void => void update((current) => ({ ...current, defaultRuntimeId: runtimeId }));
  return (
    <ListSection header="Open at launch" footer="Home shows every computer at a glance. Pick a computer to open it straight away instead.">
      <ListRow title="Home" accessory={preferences.defaultRuntimeId === null ? "checkmark" : "none"} onPress={() => choose(null)} />
      {runtimes.map((runtime) => (
        <ListRow key={runtime.installationId} title={runtime.name} accessory={preferences.defaultRuntimeId === runtime.installationId ? "checkmark" : "none"}
          onPress={() => choose(runtime.installationId)} />
      ))}
    </ListSection>
  );
}
