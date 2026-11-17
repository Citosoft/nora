import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import type { ComputerMenuProps } from "@/types/computerMenu.types";
import type { Theme } from "@/types/theme.types";
import { hairline, layout, radii, spacing, type } from "@/theme/tokens";
import { routes } from "@/navigation/routes";
import { describeReachability } from "@/reachability/probeRuntime";
import { useRuntimeDirectory } from "@/hooks/useRuntimeDirectory";
import { useRuntimeReachability } from "@/hooks/useRuntimeReachability";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "@/components/common/Icon";
import { ComputerSummary } from "@/components/runtimes/ComputerSummary";

const useNativeDriver = Platform.OS !== "web";

/** Drops down from the top bar's computer pill: every linked computer with its live status; picking one switches to it. */
export function ComputerMenu({ currentRuntimeId, visible, onClose }: ComputerMenuProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const directory = useRuntimeDirectory();
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver })
        .start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [progress, visible]);

  if (!mounted) return null;
  const state = directory.state;
  const runtimes = state.status === "ready" ? state.value.runtimes : [];
  const go = (href: string): void => {
    onClose();
    router.replace(href);
  };
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] });
  const scaleY = progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close computer list" />
      </Animated.View>
      <Animated.View accessibilityViewIsModal style={[styles.menu, { top: insets.top + layout.navBarHeight, opacity: progress, transform: [{ translateY }, { scaleY }] }]}>
        <Text style={styles.header}>Computers</Text>
        {state.status === "loading" ? <Text style={styles.note}>Finding your computers…</Text> : null}
        {state.status === "error" ? <Text style={styles.note}>{state.message}</Text> : null}
        {runtimes.map((runtime) => (
          <ComputerOption key={runtime.installationId} runtime={runtime} current={runtime.installationId === currentRuntimeId}
            onPick={() => (runtime.installationId === currentRuntimeId ? onClose() : go(routes.runtime(runtime.installationId)))} />
        ))}
        <Pressable accessibilityRole="button" onPress={() => go(routes.home)} style={({ pressed }) => [styles.row, styles.manage, pressed && styles.pressed]}>
          <Icon name="settings-outline" size={22} color={colors.text} />
          <Text style={styles.name}>Manage computers</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

function ComputerOption({ runtime, current, onPick }: { runtime: RuntimeDirectoryEntry; current: boolean; onPick: () => void }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { reachability } = useRuntimeReachability(runtime);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: current }} accessibilityLabel={`${runtime.name}, ${describeReachability(reachability)}`}
      onPress={onPick} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ComputerSummary runtime={runtime} reachability={reachability} />
      {current ? <Icon name="checkmark" size={22} color={colors.text} /> : null}
    </Pressable>
  );
}

const createStyles = (theme: Theme) => ({
  scrim: { backgroundColor: theme.colors.overlay },
  menu: { position: "absolute" as const, alignSelf: "center" as const, width: "92%" as const, maxWidth: 360, borderRadius: radii.xl,
    backgroundColor: theme.colors.elevated, paddingVertical: spacing.sm, transformOrigin: "top", boxShadow: `0px 12px 40px ${theme.colors.shadow}`,
    borderWidth: theme.scheme === "dark" ? hairline : 0, borderColor: theme.colors.separator },
  header: { ...type.footnote, fontWeight: "600" as const, color: theme.colors.textMuted, paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  note: { ...type.subheadline, color: theme.colors.textMuted, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  row: { minHeight: 56, flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.md + 2, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  manage: { borderTopWidth: hairline, borderTopColor: theme.colors.separator, marginTop: spacing.xs },
  pressed: { backgroundColor: theme.colors.pressed },
  name: { ...type.body, color: theme.colors.text }
});
