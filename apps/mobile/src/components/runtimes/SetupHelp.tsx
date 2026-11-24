import { Text, View } from "react-native";
import type { Theme } from "@/types/theme.types";
import { layout, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";
import { NORA_RELAY_NAME } from "@shared/remote-access/constants";

const steps = [
  "On your computer, open Nora Desktop and sign in with this same account.",
  `Go to Settings → ${NORA_RELAY_NAME} and turn on “Enable ${NORA_RELAY_NAME}”.`,
  "Keep that computer on, awake and online. Closing Nora's window is fine — it keeps running in the menu bar or system tray."
] as const;

/** How a computer appears here; shown when the list is empty and in Settings. */
export function SetupHelp() {
  return (
    <ListSection header="Connect a computer" separatorInset={layout.iconRowInset} footer="Your computer then shows up here automatically. No codes or pairing needed.">
      {steps.map((step, index) => <ListRow key={step} title={step} titleLines={0} leading={<StepNumber value={index + 1} />} />)}
    </ListSection>
  );
}

function StepNumber({ value }: { value: number }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.circle}><Text style={styles.number}>{value}</Text></View>;
}

const createStyles = (theme: Theme) => ({
  circle: { width: layout.iconTile, height: layout.iconTile, borderRadius: layout.iconTile / 2, backgroundColor: theme.colors.pressed, alignItems: "center" as const, justifyContent: "center" as const },
  number: { ...type.subheadline, fontWeight: "600" as const, color: theme.colors.text }
});
