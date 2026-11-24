import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ProviderPickerProps, ProviderPickerSheet } from "@/types/providerPicker.types";
import type { ActionSheetOption } from "@/types/listUi.types";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { selectModel } from "@/state/providerPicker";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/hooks/useTheme";
import { ActionSheet } from "@/components/common/ActionSheet";
import { ProviderIcon } from "@/components/common/ProviderIcon";
import { Icon } from "@/components/common/Icon";

/** Compact context strip: provider identity on the left, permissions and effort in one menu on the right. */
export function ProviderPicker({ providers, value, onChange, disabled = false }: ProviderPickerProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [sheet, setSheet] = useState<ProviderPickerSheet>(null);
  const catalog = providers.find(entry => entry.catalog.kind === value?.kind && entry.catalog.instanceId === value?.instanceId)?.catalog;
  const model = catalog?.models.find(entry => entry.id === value?.model);
  const policy = catalog?.policies.find(entry => entry.id === value?.permissionPolicy);
  const hasReasoning = Boolean(catalog?.capabilities.reasoning && model?.reasoningEfforts.length);
  const effort = value?.reasoning ?? "Default";
  const summary = [policy?.label ?? "Permissions", hasReasoning ? effort : null].filter(Boolean).join(" · ");
  const models: ActionSheetOption[] = providers.flatMap(entry => entry.catalog.authentication === "required" ? [] : entry.catalog.models.map(option => ({
    label: `${entry.label} · ${option.name}`, leading: <ProviderIcon kind={entry.catalog.kind} size={22} />,
    selected: catalog === entry.catalog && option.id === value?.model,
    onPress: () => onChange(selectModel(entry.catalog, option.id, value))
  })));
  const permissions: ActionSheetOption[] = catalog?.policies.map(option => ({ label: option.label, icon: "shield-checkmark-outline",
    selected: option.id === value?.permissionPolicy, destructive: option.posture === "full",
    onPress: () => { if (value) onChange({ ...value, permissionPolicy: option.id }); } })) ?? [];
  const reasoning: ActionSheetOption[] = [{ label: "Model default", selected: value?.reasoning === null,
    onPress: () => { if (value) onChange({ ...value, reasoning: null }); } },
    ...(model?.reasoningEfforts.map(option => ({ label: option, selected: value?.reasoning === option,
      onPress: () => { if (value) onChange({ ...value, reasoning: option }); } })) ?? [])];
  const settings: ActionSheetOption[] = [
    { label: `Permissions · ${policy?.label ?? "Choose"}`, icon: "shield-checkmark-outline", onPress: () => setSheet("permissions") },
    ...(hasReasoning ? [{ label: `Reasoning · ${effort}`, icon: "sparkles-outline" as const, onPress: () => setSheet("reasoning") }] : [])
  ];
  const options = sheet === "model" ? models : sheet === "permissions" ? permissions : sheet === "reasoning" ? reasoning : settings;
  const title = sheet === "model" ? "Provider & model" : sheet === "permissions" ? "Permissions" : sheet === "reasoning" ? "Reasoning" : "Thread settings";
  return <View style={styles.row}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Model: ${model?.name ?? value?.model ?? "Choose model"}`}
      accessibilityState={{ disabled: disabled || !models.length, expanded: sheet === "model" }} disabled={disabled || !models.length}
      onPress={() => setSheet("model")} style={({ pressed }) => [styles.model, pressed && styles.pressed, disabled && styles.disabled]}>
      {value ? <ProviderIcon kind={value.kind} size={18} /> : <Icon name="sparkles-outline" size={18} color={colors.textMuted} />}
      <Text style={styles.modelLabel} numberOfLines={1}>{model?.name ?? value?.model ?? "Choose model"}</Text>
      <Icon name="chevron-down" size={12} color={colors.textMuted} />
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`Thread settings: ${summary}`} accessibilityState={{ disabled: disabled || !catalog || !value, expanded: sheet === "settings" }}
      disabled={disabled || !catalog || !value} onPress={() => setSheet("settings")} style={({ pressed }) => [styles.settings, pressed && styles.pressed, disabled && styles.disabled]}>
      <Icon name="shield-checkmark-outline" size={14} color={colors.textMuted} />
      <Text style={styles.summary} numberOfLines={1}>{summary}</Text>
      <Icon name="chevron-down" size={12} color={colors.textMuted} />
    </Pressable>
    <ActionSheet visible={sheet !== null} title={title} options={disabled ? [] : options} onClose={() => setSheet(null)}
      message={sheet === "permissions" ? "Choose what the agent can do on your computer." : undefined} />
  </View>;
}

const createStyles = (theme: Theme) => ({
  row: { flexDirection: "row" as const, alignItems: "center" as const, width: "100%" as const, gap: spacing.sm },
  model: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.xs + 2, paddingLeft: spacing.sm },
  modelLabel: { ...type.footnote, fontWeight: "500" as const, color: theme.colors.textMuted, flexShrink: 1 },
  settings: { maxWidth: "48%" as const, minHeight: 44, flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.xs, paddingRight: spacing.sm },
  summary: { ...type.caption, color: theme.colors.textMuted, flexShrink: 1 },
  pressed: { opacity: 0.5 },
  disabled: { opacity: 0.5 }
});
