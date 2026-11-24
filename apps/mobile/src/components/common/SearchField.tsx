import { Pressable, TextInput, View } from "react-native";
import type { Theme } from "@/types/theme.types";
import { radii, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "./Icon";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

/** iOS search field: magnifier, rounded fill and a clear button while there is text. */
export function SearchField({ value, onChange, placeholder }: SearchFieldProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Icon name="search" size={17} color={colors.textMuted} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} accessibilityLabel={placeholder} placeholderTextColor={colors.textMuted}
        style={styles.input} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
      {value ? (
        <Pressable onPress={() => onChange("")} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8}>
          <Icon name="close-circle" size={17} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  field: { height: 38, flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.xs + 2, paddingHorizontal: spacing.md - 2,
    borderRadius: radii.sm + 2, backgroundColor: theme.colors.searchFill },
  input: { ...type.body, flex: 1, minWidth: 0, color: theme.colors.text, paddingVertical: 0, outlineWidth: 0 }
});
