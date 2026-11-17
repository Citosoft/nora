import { useState } from "react";
import { Pressable, Text } from "react-native";
import type { StatusTone } from "@/types/conversationState.types";
import type { Theme } from "@/types/theme.types";
import { radii, spacing, type } from "@/theme/tokens";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "@/components/common/Icon";
import { StatusDot } from "@/components/common/StatusDot";
import { ComputerMenu } from "./ComputerMenu";

/** The home screen's centred capsule naming the computer chats run on; tapping it drops down the list of computers. */
export function ComputerPill({ runtimeId }: { runtimeId: string }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const lookup = useRuntimeSession(runtimeId);
  const [open, setOpen] = useState(false);
  const name = lookup.status === "ready" ? lookup.name : "Nora";
  const tone: StatusTone = lookup.status !== "ready" ? "neutral" : lookup.snapshot.info.status === "error" ? "danger"
    : lookup.snapshot.info.status === "ready" ? "success" : "neutral";
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`Computer: ${name}. Switch computer`} accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)} style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
        <StatusDot tone={tone} size={8} />
        <Text style={styles.label} numberOfLines={1}>{name}</Text>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={15} color={colors.textMuted} />
      </Pressable>
      <ComputerMenu currentRuntimeId={runtimeId} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const createStyles = (theme: Theme) => ({
  pill: { height: 40, maxWidth: "100%" as const, flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, paddingHorizontal: spacing.lg + 2,
    borderRadius: radii.pill, backgroundColor: theme.scheme === "dark" ? "#1A1A1A" : theme.colors.fill },
  pressed: { opacity: 0.6 },
  label: { ...type.headline, color: theme.colors.text, flexShrink: 1 }
});
