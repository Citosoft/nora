import { Text, View } from "react-native";
import type { Theme } from "@/types/theme.types";
import { type as typography } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";

const steps = [
  "On your computer, open Nora Desktop and sign in with this same account.",
  "Go to Settings → Remote access and turn on “Enable remote access”.",
  "Keep that computer on, awake and online. Closing Nora's window is fine — it keeps running in the menu bar or system tray."
] as const;

/** How a computer appears here; shown when the list is empty and in Settings. */
export function SetupHelp() {
  return (
    <ListSection header="Connect a computer" separatorInset={58} footer="Your computer then shows up here automatically. No codes or pairing needed.">
      {steps.map((step, index) => <ListRow key={step} title={step} titleLines={0} leading={<StepNumber value={index + 1} />} />)}
    </ListSection>
  );
}

function StepNumber({ value }: { value: number }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.circle}><Text style={styles.number}>{value}</Text></View>;
}

const createStyles = (theme: Theme) => ({
  circle: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.pressed, alignItems: "center" as const, justifyContent: "center" as const },
  number: { ...typography.subheadline, fontWeight: "600" as const, color: theme.colors.text }
});
