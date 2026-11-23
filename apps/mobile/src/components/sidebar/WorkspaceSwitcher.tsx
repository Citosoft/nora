import { useState } from "react";
import { View } from "react-native";
import { spacing } from "@/theme/tokens";
import type { WorkspaceSwitcherProps } from "@/types/sidebar.types";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/common/Icon";
import { ActionSheet } from "@/components/common/ActionSheet";
import { SidebarRow } from "./SidebarRow";

const allWorkspacesLabel = "All workspaces";

/** One compact row naming the workspace whose chats are shown, like the desktop switcher; tapping it opens a sheet to pick another. */
export function WorkspaceSwitcher({ workspaces, selectedId, onSelect }: WorkspaceSwitcherProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = workspaces.find((workspace) => workspace.id === selectedId) ?? null;
  const label = selected?.name ?? allWorkspacesLabel;
  return (
    <>
      <SidebarRow label={label} icon={selected ? "folder-open-outline" : "folder-outline"} onPress={() => setOpen(true)}
        accessibilityLabel={`Workspace: ${label}. Switch workspace`}
        trailing={<View style={{ paddingRight: spacing.md }}><Icon name="chevron-down" size={17} color={colors.textMuted} /></View>} />
      <ActionSheet visible={open} title="Show chats from" onClose={() => setOpen(false)}
        options={[
          { label: allWorkspacesLabel, selected: selected === null, onPress: () => onSelect(null) },
          ...workspaces.map((workspace) => ({ label: workspace.name, selected: workspace.id === selected?.id, onPress: () => onSelect(workspace.id) }))
        ]} />
    </>
  );
}
