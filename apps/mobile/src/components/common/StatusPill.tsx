import { Text, View } from "react-native";
import type { StatusTone } from "@/types/conversationState.types";
import { radii, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";

/** A small tinted capsule for states such as "Needs approval". */
export function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  const colors = useTheme().colors.tones[tone];
  return (
    <View style={{ backgroundColor: colors.background, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, alignSelf: "flex-start" }}
      accessibilityLabel={`Status: ${label}`}>
      <Text style={{ ...type.caption, color: colors.text, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}
