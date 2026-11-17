import { ActivityIndicator, Text, View } from "react-native";
import type { IconName } from "@/types/icon.types";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Button } from "./Button";
import { Icon } from "./Icon";

type StateViewProps =
  | { kind: "loading"; message: string }
  | { kind: "empty"; title: string; message?: string; icon?: IconName }
  | { kind: "error"; title: string; message: string; onRetry?: () => void };

/** Centred loading, empty and error states in the style of iOS's ContentUnavailableView. */
export function StateView(props: StateViewProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  if (props.kind === "loading") {
    return (
      <View style={styles.container} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.textMuted} />
        <Text style={styles.message}>{props.message}</Text>
      </View>
    );
  }
  const icon: IconName = props.kind === "error" ? "cloud-offline-outline" : props.icon ?? "file-tray-outline";
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <Icon name={icon} size={44} color={colors.textTertiary} />
      <Text style={styles.title}>{props.title}</Text>
      {props.message ? <Text style={styles.message}>{props.message}</Text> : null}
      {props.kind === "error" && props.onRetry ? <View style={styles.action}><Button label="Try again" compact onPress={props.onRetry} /></View> : null}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  container: { alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: spacing.xxl, paddingVertical: spacing.xxl, gap: spacing.sm },
  title: { ...type.title3, fontWeight: "700" as const, color: theme.colors.text, textAlign: "center" as const, marginTop: spacing.xs },
  message: { ...type.subheadline, color: theme.colors.textMuted, textAlign: "center" as const, maxWidth: 420 },
  action: { marginTop: spacing.sm }
});
