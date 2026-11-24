import { Pressable, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import type { IconName } from "@/types/icon.types";
import type { Theme } from "@/types/theme.types";
import { layout, radii, spacing, type } from "@/theme/tokens";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "@/components/common/Icon";
import { SectionHeader } from "@/components/common/SectionHeader";

interface QuickAction {
  label: string;
  icon: IconName;
  href: Href;
}

/** Two-by-two shortcuts into the main computer: a new chat, its inbox, what's running and its bots. */
export function QuickActions({ runtime }: { runtime: RuntimeDirectoryEntry }) {
  const styles = useThemedStyles(createStyles);
  const id = runtime.installationId;
  const actions: QuickAction[] = [
    { label: "New chat", icon: "create-outline", href: routes.runtime(id) },
    { label: "Inbox", icon: "file-tray-outline", href: routes.inbox(id) },
    { label: "Activity", icon: "pulse-outline", href: routes.activity(id) },
    { label: "Bots", icon: "people-outline", href: routes.manageBots(id) }
  ];
  return (
    <View style={styles.section}>
      <SectionHeader title={`Jump in on ${runtime.name}`} />
      <View style={styles.grid}>
        {actions.map((action, index) => <ActionTile key={action.label} action={action} primary={index === 0} computerName={runtime.name} />)}
      </View>
    </View>
  );
}

function ActionTile({ action, primary, computerName }: { action: QuickAction; primary: boolean; computerName: string }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const foreground = primary ? colors.accentText : colors.text;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${action.label} on ${computerName}`} onPress={() => router.push(action.href)}
      style={({ pressed }) => [styles.tile, primary && styles.primary, pressed && styles.pressed]}>
      <Icon name={action.icon} size={24} color={foreground} />
      <Text style={[styles.label, { color: foreground }]} numberOfLines={1}>{action.label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) => ({
  section: { gap: spacing.sm - 2 },
  grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm, paddingHorizontal: layout.gutter },
  tile: { flexGrow: 1, flexBasis: "45%" as const, minHeight: 88, borderRadius: radii.xl, backgroundColor: theme.colors.composer,
    padding: spacing.lg, justifyContent: "space-between" as const, gap: spacing.md },
  primary: { backgroundColor: theme.colors.accent },
  pressed: { opacity: 0.7 },
  label: { ...type.headline }
});
