import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import type { Theme } from "@/types/theme.types";
import { layout, spacing, type } from "@/theme/tokens";
import { Button } from "@/components/common/Button";
import { StatusDot } from "@/components/common/StatusDot";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useThemedStyles } from "@/hooks/useThemedStyles";

/** In demo mode, a slim strip above every screen says the activity is simulated and offers a way out. */
export function DemoFrame({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  const { active, exit } = useDemoMode();
  const insets = useSafeAreaInsets();
  if (!active) return <>{children}</>;
  return (
    <View style={styles.fill}>
      <View style={[styles.strip, { paddingTop: insets.top }]} accessibilityRole="summary">
        <View style={styles.row}>
          <StatusDot tone="active" size={7} />
          <Text style={styles.label} numberOfLines={1}>Demo mode · Simulated activity</Text>
          <Button label="Leave demo" compact variant="ghost" onPress={exit} />
        </View>
      </View>
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>{children}</SafeAreaInsetsContext.Provider>
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  fill: { flex: 1 },
  strip: { backgroundColor: theme.colors.fill, paddingHorizontal: layout.gutter },
  row: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
  label: { ...type.footnote, color: theme.colors.textMuted, flex: 1 }
});
