import { useState } from "react";
import { Pressable, Text } from "react-native";
import type { RemoteProject } from "@shared/types/remote-access/runtimeApi.types";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { ActionSheet } from "@/components/common/ActionSheet";
import { Icon } from "@/components/common/Icon";

interface ProjectMenuProps {
  projects: readonly RemoteProject[];
  selected: RemoteProject | null;
  onSelect: (projectId: string) => void;
  disabled?: boolean;
}

/** The composer's project menu ("Nora ⌄", like ChatGPT's effort menu); opens an action sheet to choose where a new chat runs. */
export function ProjectMenu({ projects, selected, onSelect, disabled = false }: ProjectMenuProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const choosable = projects.length > 1 && !disabled;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`Project: ${selected?.name ?? "none"}`} accessibilityHint={choosable ? "Choose a project" : undefined}
        disabled={!choosable} onPress={() => setOpen(true)} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
        <Text style={styles.label} numberOfLines={1}>{selected?.name ?? "No project"}</Text>
        {choosable ? <Icon name="chevron-down" size={16} color={colors.textMuted} /> : null}
      </Pressable>
      <ActionSheet visible={open} title="Start the chat in" onClose={() => setOpen(false)}
        options={projects.map((project) => ({ label: project.name, selected: project.id === selected?.id, onPress: () => onSelect(project.id) }))} />
    </>
  );
}

const createStyles = (theme: Theme) => ({
  chip: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.xs + 2, maxWidth: "100%" as const, height: 42, paddingHorizontal: spacing.sm },
  pressed: { opacity: 0.5 },
  label: { ...type.composer, color: theme.colors.textMuted, flexShrink: 1 }
});
