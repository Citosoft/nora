import type { ThemePreference } from "@/types/preferences.types";
import { layout } from "@/theme/tokens";
import type { IconTileSpec } from "@/types/listUi.types";
import { useTheme } from "@/hooks/useTheme";
import { usePreferences } from "@/hooks/usePreferences";
import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";

const choices: readonly { value: ThemePreference; label: string; icon: IconTileSpec["icon"] }[] = [
  { value: "system", label: "Automatic", icon: "contrast" },
  { value: "light", label: "Light", icon: "sunny" },
  { value: "dark", label: "Dark", icon: "moon" }
];

export function ThemePicker() {
  const { preferences, update } = usePreferences();
  const { colors } = useTheme();
  return (
    <ListSection header="Appearance" separatorInset={layout.iconRowInset}>
      {choices.map((choice) => (
        <ListRow key={choice.value} title={choice.label} icon={{ icon: choice.icon, color: colors.tones.neutral.solid }}
          accessory={preferences.theme === choice.value ? "checkmark" : "none"} onPress={() => void update((current) => ({ ...current, theme: choice.value }))} />
      ))}
    </ListSection>
  );
}
