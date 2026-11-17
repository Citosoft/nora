import { View } from "react-native";
import type { StatusTone } from "@/types/conversationState.types";
import { useTheme } from "@/hooks/useTheme";

/** A coloured dot for list rows (online, working, needs attention); purely visual, so rows must also say the state. */
export function StatusDot({ tone, size = 8 }: { tone: StatusTone; size?: number }) {
  const { colors } = useTheme();
  return <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.tones[tone].solid }} />;
}
