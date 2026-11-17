import { Text, TextInput, View, type TextInputProps } from "react-native";
import type { Theme } from "@/types/theme.types";
import { radii, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

interface TextFieldProps extends Pick<TextInputProps, "value" | "onChangeText" | "placeholder" | "multiline" | "autoFocus" | "maxLength" | "onSubmitEditing" | "returnKeyType"> {
  label: string;
  hint?: string | undefined;
  error?: string | null;
  /** Hides the visible label where the context already names the field (e.g. inside an alert). */
  hideLabel?: boolean;
}

export function TextField({ label, hint, error, multiline, hideLabel = false, ...input }: TextFieldProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  return (
    <View style={styles.field}>
      {hideLabel ? null : <Text style={styles.label}>{label}</Text>}
      <TextInput {...input} multiline={multiline} accessibilityLabel={label} accessibilityHint={hint} placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, multiline && styles.multiline, error ? styles.invalid : null]} />
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  field: { gap: spacing.xs + 2 },
  label: { ...type.footnote, fontWeight: "600" as const, color: theme.colors.textMuted },
  input: { ...type.body, minHeight: 40, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    color: theme.colors.text, backgroundColor: theme.scheme === "dark" ? theme.colors.fill : theme.colors.surface,
    borderWidth: 1, borderColor: theme.scheme === "dark" ? "transparent" : theme.colors.separator },
  multiline: { minHeight: 88, textAlignVertical: "top" as const },
  invalid: { borderColor: theme.colors.danger },
  hint: { ...type.footnote, color: theme.colors.textMuted },
  error: { ...type.footnote, color: theme.colors.danger }
});
