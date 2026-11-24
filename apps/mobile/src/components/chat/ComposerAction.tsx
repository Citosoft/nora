import { ActivityIndicator, Pressable } from "react-native";
import type { ComposerActionProps } from "@/types/composer.types";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/common/Icon";

export function ComposerAction({ label, icon, busy, disabled, onPress, filled = false }: ComposerActionProps) {
  const { colors } = useTheme();
  const active = filled && (!disabled || busy);
  const color = active ? colors.background : colors.textMuted;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy}
    onPress={onPress} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
      backgroundColor: active ? colors.text : "transparent", opacity: pressed ? 0.6 : disabled && !busy ? 0.4 : 1 })}>
    {busy ? <ActivityIndicator size="small" color={color} /> : <Icon name={icon} size={icon === "stop" ? 16 : 22} color={color} />}
  </Pressable>;
}
