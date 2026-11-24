import { Pressable, Text, View } from "react-native";
import { useAppAccount } from "@/hooks/useAppAccount";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { StatusTone } from "@/types/conversationState.types";
import type { Theme } from "@/types/theme.types";
import { hairline, spacing, type } from "@/theme/tokens";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { AccountAvatar } from "@/components/common/AccountAvatar";
import { StatusDot } from "@/components/common/StatusDot";


interface SidebarFooterProps {
  runtimeId: string;
  runtimeName: string;
  onOpenSettings: () => void;
}

/** Account row pinned to the bottom of the sidebar: avatar, name and the computer in use; opens Settings. */
export function SidebarFooter({ runtimeId, runtimeName, onOpenSettings }: SidebarFooterProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { user } = useAppAccount();
  const lookup = useRuntimeSession(runtimeId);
  const tone: StatusTone = lookup.status !== "ready" ? "neutral" : lookup.snapshot.info.status === "error" ? "danger"
    : lookup.snapshot.info.status === "ready" ? "success" : "neutral";
  const name = user?.fullName || user?.email || "Your account";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${name}, on ${runtimeName}. Settings`} onPress={onOpenSettings}
      style={({ pressed }) => [styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }, pressed && styles.pressed]}>
      <AccountAvatar imageUrl={user?.imageUrl ?? null} name={name} size={40} />
      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.runtime}>
          <StatusDot tone={tone} size={7} />
          <Text style={styles.runtimeName} numberOfLines={1}>{runtimeName}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) => ({
  footer: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.md,
    borderTopWidth: hairline, borderTopColor: theme.colors.separator },
  pressed: { opacity: 0.6 },
  texts: { flex: 1, minWidth: 0 },
  name: { ...type.body, color: theme.colors.text },
  runtime: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.xs + 2 },
  runtimeName: { ...type.subheadline, color: theme.colors.textMuted, flexShrink: 1 }
});
