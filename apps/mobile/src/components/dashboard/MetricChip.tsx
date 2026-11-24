import { Pressable, StyleSheet, Text } from "react-native";
import type { StatusTone } from "@/types/conversationState.types";
import { radii, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { StatusDot } from "@/components/common/StatusDot";

interface MetricChipProps {
  label: string;
  tone: StatusTone;
  onPress?: () => void;
  accessibilityHint?: string;
}

/** A tinted capsule with a status dot for a computer's live counts ("2 need you"); tappable when it leads somewhere. */
export function MetricChip({ label, tone, onPress, accessibilityHint }: MetricChipProps) {
  const colors = useTheme().colors.tones[tone];
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? "button" : "text"} accessibilityLabel={label} accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.chip, { backgroundColor: colors.background }, pressed && styles.pressed]}>
      <StatusDot tone={tone} size={7} />
      <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2, borderRadius: radii.pill,
    paddingHorizontal: spacing.md, minHeight: 30 },
  pressed: { opacity: 0.7 },
  label: { ...type.footnote, fontWeight: "600" }
});
