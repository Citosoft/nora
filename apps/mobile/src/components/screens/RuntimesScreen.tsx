import { useState } from "react";
import { RefreshControl, Text, View } from "react-native";
import { router } from "expo-router";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import type { Theme } from "@/types/theme.types";
import { spacing } from "@/theme/tokens";
import { routes } from "@/navigation/routes";
import { relativeTime } from "@/state/relativeTime";
import { useNow } from "@/hooks/useNow";
import { useOpenDefaultRuntimeOnce } from "@/hooks/useOpenDefaultRuntimeOnce";
import { usePreferences } from "@/hooks/usePreferences";
import { useRuntimeDirectory } from "@/hooks/useRuntimeDirectory";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Banner } from "@/components/common/Banner";
import { Button } from "@/components/common/Button";
import { Inset } from "@/components/common/Inset";
import { ListSection } from "@/components/common/ListSection";
import { NavButton } from "@/components/common/NavButton";
import { Screen } from "@/components/common/Screen";
import { StateView } from "@/components/common/StateView";
import { InstallHint } from "@/components/runtimes/InstallHint";
import { RemoveRuntimeDialog } from "@/components/runtimes/RemoveRuntimeDialog";
import { RenameRuntimeDialog } from "@/components/runtimes/RenameRuntimeDialog";
import { RuntimeRow } from "@/components/runtimes/RuntimeRow";
import { SetupHelp } from "@/components/runtimes/SetupHelp";

/** My computers: every computer linked to this account, each probed directly for real reachability. */
export function RuntimesScreen() {
  const styles = useThemedStyles(createStyles);
  const directory = useRuntimeDirectory();
  const { preferences, update } = usePreferences();
  const now = useNow();
  const [renaming, setRenaming] = useState<RuntimeDirectoryEntry | null>(null);
  const [removing, setRemoving] = useState<RuntimeDirectoryEntry | null>(null);
  const state = directory.state;
  const view = state.status === "ready" ? state.value : null;
  useOpenDefaultRuntimeOnce(preferences.defaultRuntimeId, view?.runtimes ?? null);

  const runtimes = view ? [...view.runtimes].sort((left, right) =>
    Number(right.installationId === preferences.defaultRuntimeId) - Number(left.installationId === preferences.defaultRuntimeId)) : [];
  const refreshing = state.status === "ready" && state.refreshing;

  return (
    <Screen title="Computers" variant="plain"
      leading={<NavButton icon="settings-outline" label="Settings" onPress={() => router.push(routes.settings)} />}
      trailing={<NavButton icon="refresh" label="Refresh" busy={refreshing} onPress={() => void directory.refresh()} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void directory.refresh()} />}>
      <View style={styles.hero}>
        <Text style={styles.heading} accessibilityRole="header">Where should Nora work?</Text>
        <Text style={styles.subheading}>Pick a computer to chat with its agents.</Text>
      </View>
      {!preferences.installHintDismissed ? <InstallHint onDismiss={() => void update((current) => ({ ...current, installHintDismissed: true }))} /> : null}
      {state.status === "loading" ? <StateView kind="loading" message="Finding your computers…" /> : null}
      {state.status === "error" ? (
        <StateView kind="error" title="Couldn't load your computers" message={state.message} onRetry={() => void directory.refresh()} />
      ) : null}
      {view?.source === "cached" ? (
        <Inset>
          <Banner tone="attention" title="Showing your saved list"
            message={`${view.liveError ?? "Nora's account service is unreachable."}${view.savedAt ? ` Saved ${relativeTime(view.savedAt, now)}.` : ""}`}
            action={<Button label="Try again" compact onPress={() => void directory.refresh()} />} />
        </Inset>
      ) : null}
      {view && runtimes.length === 0 ? (
        <StateView kind="empty" icon="desktop-outline" title="No computers yet" message="Turn on Remote access in Nora Desktop and your computer appears here." />
      ) : null}
      <ListSection separatorInset={58}
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

const createStyles = (theme: Theme) => ({
  hero: { paddingHorizontal: spacing.xl + spacing.xs, paddingTop: spacing.lg, paddingBottom: spacing.xs, gap: spacing.xs },
  heading: { fontSize: 28, lineHeight: 34, fontWeight: "400" as const, letterSpacing: -0.4, color: theme.colors.text },
  subheading: { fontSize: 17, lineHeight: 22, color: theme.colors.textMuted }
});
