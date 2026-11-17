import { Pressable, Text, View } from "react-native";
import type { Theme } from "@/types/theme.types";
import { hairline, radii, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "@/components/common/Icon";

interface QuestionOptionsProps {
  label: string;
  options: readonly string[];
  selected: readonly string[];
  multiple: boolean;
  disabled: boolean;
  onToggle: (option: string) => void;
}

/** An agent's offered answers as a grouped list: checkmarks for one choice, filled circles for several. */
export function QuestionOptions({ label, options, selected, multiple, disabled, onToggle }: QuestionOptionsProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.group} accessibilityRole={multiple ? undefined : "radiogroup"} accessibilityLabel={label}>
      {options.map((option, index) => {
        const active = selected.includes(option);
        return (
          <Pressable key={option} disabled={disabled} onPress={() => onToggle(option)} accessibilityRole={multiple ? "checkbox" : "radio"}
            accessibilityState={{ checked: active, disabled }} accessibilityLabel={option}
            style={({ pressed }) => [styles.row, index > 0 && styles.separated, pressed && styles.pressed, disabled && styles.disabled]}>
            {multiple ? <Icon name={active ? "checkmark-circle" : "ellipse-outline"} size={22} color={active ? colors.accent : colors.textTertiary} /> : null}
            <Text style={styles.label}>{option}</Text>
            {!multiple && active ? <Icon name="checkmark" size={20} color={colors.accent} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  group: { borderRadius: radii.md, backgroundColor: theme.colors.codeBackground, overflow: "hidden" as const },
  row: { minHeight: 46, flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.md, paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm },
  separated: { borderTopWidth: hairline, borderTopColor: theme.colors.separator },
  pressed: { backgroundColor: theme.colors.pressed },
  disabled: { opacity: 0.5 },
  label: { ...type.body, flex: 1, color: theme.colors.text }
});
