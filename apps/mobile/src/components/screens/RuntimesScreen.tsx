import { useState } from "react";
import { RefreshControl } from "react-native";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import { layout } from "@/theme/tokens";
import { routes } from "@/navigation/routes";
import { useNow } from "@/hooks/useNow";
import { usePreferences } from "@/hooks/usePreferences";
import { useRuntimeDirectory } from "@/hooks/useRuntimeDirectory";
import { ListSection } from "@/components/common/ListSection";
import { NavButton } from "@/components/common/NavButton";
import { Screen } from "@/components/common/Screen";
import { StateView } from "@/components/common/StateView";
import { DirectoryNotices } from "@/components/runtimes/DirectoryNotices";
import { RemoveRuntimeDialog } from "@/components/runtimes/RemoveRuntimeDialog";
import { RenameRuntimeDialog } from "@/components/runtimes/RenameRuntimeDialog";
import { RuntimeRow } from "@/components/runtimes/RuntimeRow";
import { SetupHelp } from "@/components/runtimes/SetupHelp";
import { NORA_RELAY_NAME } from "@shared/remote-access/constants";

/** My computers: every computer linked to this account, each probed directly for real reachability, with rename and remove. */
export function RuntimesScreen() {
  const directory = useRuntimeDirectory();
  const { preferences } = usePreferences();
  const now = useNow();
  const [renaming, setRenaming] = useState<RuntimeDirectoryEntry | null>(null);
  const [removing, setRemoving] = useState<RuntimeDirectoryEntry | null>(null);
  const state = directory.state;
  const view = state.status === "ready" ? state.value : null;

  const runtimes = view ? [...view.runtimes].sort((left, right) =>
    Number(right.installationId === preferences.defaultRuntimeId) - Number(left.installationId === preferences.defaultRuntimeId)) : [];
  const refreshing = state.status === "ready" && state.refreshing;

  return (
    <Screen title="Computers" largeTitle subtitle="Pick a computer to chat with its agents" back={{ label: "Home", fallbackHref: routes.home }}
      trailing={<NavButton icon="refresh" label="Refresh" busy={refreshing} onPress={() => void directory.refresh()} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void directory.refresh()} />}>
      <DirectoryNotices directory={directory} now={now} />
      {view && runtimes.length === 0 ? (
        <StateView kind="empty" icon="desktop-outline" title="No computers yet" message={`Turn on ${NORA_RELAY_NAME} in Nora Desktop and your computer appears here.`} />
      ) : null}
      <ListSection separatorInset={layout.iconRowInset}
        footer={runtimes.length ? "Agents run on your computer, so it needs to be on, awake and online with Nora running." : undefined}>
        {runtimes.map((runtime) => (
          <RuntimeRow key={runtime.installationId} runtime={runtime} now={now} isDefault={runtime.installationId === preferences.defaultRuntimeId}
            lastConnected={preferences.lastConnected[runtime.installationId] ?? null}
            onRename={() => setRenaming(runtime)} onRemove={() => setRemoving(runtime)} />
        ))}
      </ListSection>
      {view && runtimes.length === 0 ? <SetupHelp /> : null}
      <RenameRuntimeDialog runtime={renaming} onRename={directory.rename} onClose={() => setRenaming(null)} />
      <RemoveRuntimeDialog runtime={removing} onRemove={directory.remove} onClose={() => setRemoving(null)} />
    </Screen>
  );
}
