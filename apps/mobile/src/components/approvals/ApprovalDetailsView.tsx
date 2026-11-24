import { Text, View } from "react-native";
import type { ApprovalDetails } from "@shared/types/conversation/contracts.types";
import type { Theme } from "@/types/theme.types";
import { monospaceFont, radii, spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";

/** Exactly what the agent wants to do, as the runtime described it. */
export function ApprovalDetailsView({ details }: { details: ApprovalDetails }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.box}>
      {details.reason ? <Text style={styles.text}>{details.reason}</Text> : null}
      {details.command ? <Field label="Command" value={details.command} /> : null}
      {details.workingDirectory ? <Field label="In folder" value={details.workingDirectory} /> : null}
      {details.target ? <Field label="Target" value={details.target} /> : null}
      {details.paths?.length ? <Field label={details.paths.length === 1 ? "File" : `${details.paths.length} files`} value={details.paths.join("\n")} /> : null}
      {details.input ? <Field label="Details" value={details.input} /> : null}
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text style={styles.code} selectable numberOfLines={12}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  box: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { ...type.eyebrow, color: theme.colors.textMuted },
  text: { ...type.subheadline, color: theme.colors.text },
  code: { ...type.code, fontFamily: monospaceFont, color: theme.colors.text, backgroundColor: theme.colors.codeBackground,
    padding: spacing.md - 2, borderRadius: radii.sm }
});
