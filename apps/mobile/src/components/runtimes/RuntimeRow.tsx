import { useState } from "react";
import { Pressable } from "react-native";
import { router } from "expo-router";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import type { Theme } from "@/types/theme.types";
import { spacing } from "@/theme/tokens";
import { routes } from "@/navigation/routes";
import { describeReachability } from "@/reachability/probeRuntime";
import { relativeTime } from "@/state/relativeTime";
import { useRuntimeReachability } from "@/hooks/useRuntimeReachability";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { ActionSheet } from "@/components/common/ActionSheet";
import { BarIconButton } from "@/components/common/BarIconButton";
import { Icon } from "@/components/common/Icon";
import { ComputerSummary } from "./ComputerSummary";

interface RuntimeRowProps {
  runtime: RuntimeDirectoryEntry;
  lastConnected: string | null;
  isDefault: boolean;
  now: Date;
  onRename: () => void;
  onRemove: () => void;
}

/** One linked computer: tap to open its chats, "…" (or long press) for check, rename and remove. */
export function RuntimeRow({ runtime, lastConnected, isDefault, now, onRename, onRemove }: RuntimeRowProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { reachability, recheck } = useRuntimeReachability(runtime);
  const [menuOpen, setMenuOpen] = useState(false);
  const seen = lastConnected ? `Last connected ${relativeTime(lastConnected, now)}` : "Not connected from this device yet";
  const open = (): void => router.push(routes.runtime(runtime.installationId));
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${runtime.name}${isDefault ? ", default" : ""}, ${describeReachability(reachability)}. ${seen}`}
        accessibilityHint="Opens this computer" onPress={open} onLongPress={() => setMenuOpen(true)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <ComputerSummary runtime={runtime} reachability={reachability} detail={lastConnected ? `Seen ${relativeTime(lastConnected, now)}` : null}
          badge={isDefault ? "Default" : null} />
        <BarIconButton label={`More for ${runtime.name}`} onPress={() => setMenuOpen(true)}>
          <Icon name="ellipsis-horizontal" size={22} color={colors.textMuted} />
        </BarIconButton>
      </Pressable>
      <ActionSheet visible={menuOpen} title={runtime.name} message={seen} onClose={() => setMenuOpen(false)}
        options={[
          { label: "Open", icon: "open-outline", onPress: open },
          { label: "Check connection", icon: "refresh", onPress: recheck },
          { label: "Rename", icon: "pencil", onPress: onRename },
          { label: "Remove from account", icon: "trash-outline", destructive: true, onPress: onRemove }
        ]} />
    </>
  );
}

const createStyles = (theme: Theme) => ({
  row: { minHeight: 64, flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.md + 2, paddingLeft: spacing.xl, paddingRight: spacing.sm,
    paddingVertical: spacing.sm },
  pressed: { backgroundColor: theme.colors.pressed }
});
