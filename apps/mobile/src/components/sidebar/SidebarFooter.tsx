import { Image, Pressable, Text, View } from "react-native";
import { useUser } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { StatusTone } from "@/types/conversationState.types";
import type { Theme } from "@/types/theme.types";
import { hairline, spacing, type } from "@/theme/tokens";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { StatusDot } from "@/components/common/StatusDot";

const avatarSize = 40;

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("") || "N";
}

interface SidebarFooterProps {
  runtimeId: string;
  runtimeName: string;
  onOpenSettings: () => void;
}

/** Account row pinned to the bottom of the sidebar: avatar, name and the computer in use; opens Settings. */
export function SidebarFooter({ runtimeId, runtimeName, onOpenSettings }: SidebarFooterProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const lookup = useRuntimeSession(runtimeId);
  const tone: StatusTone = lookup.status !== "ready" ? "neutral" : lookup.snapshot.info.status === "error" ? "danger"
    : lookup.snapshot.info.status === "ready" ? "success" : "neutral";
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Your account";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${name}, on ${runtimeName}. Settings`} onPress={onOpenSettings}
      style={({ pressed }) => [styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }, pressed && styles.pressed]}>
      {user?.imageUrl && user.hasImage ? <Image source={{ uri: user.imageUrl }} style={styles.avatar} accessible={false} />
        : <View style={[styles.avatar, { backgroundColor: colors.tones.attention.solid }]}><Text style={styles.initials}>{initialsOf(name)}</Text></View>}
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
  avatar: { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, alignItems: "center" as const, justifyContent: "center" as const },
  initials: { ...type.subheadline, fontWeight: "500" as const, color: "#FFFFFF" },
  texts: { flex: 1, minWidth: 0 },
  name: { ...type.body, color: theme.colors.text },
  runtime: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
  runtimeName: { ...type.subheadline, color: theme.colors.textMuted, flexShrink: 1 }
});
