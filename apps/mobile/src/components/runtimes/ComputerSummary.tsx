import { Text, View } from "react-native";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import type { RuntimeReachability } from "@/types/reachability.types";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { describeReachability } from "@/reachability/probeRuntime";
import { reachabilityTone } from "@/state/reachabilityTone";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "@/components/common/Icon";
import { StatusDot } from "@/components/common/StatusDot";

interface ComputerSummaryProps {
  runtime: RuntimeDirectoryEntry;
  reachability: RuntimeReachability;
  /** Extra muted text after the status (e.g. "Last connected 2m ago"). */
  detail?: string | null;
  badge?: string | null;
}

/** A computer's outline icon, name and live status line, shared by the computer list and the top-bar switcher. */
export function ComputerSummary({ runtime, reachability, detail, badge }: ComputerSummaryProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <>
      <Icon name={runtime.environment === "server" ? "server-outline" : "laptop-outline"} size={24} color={colors.text} />
      <View style={styles.texts}>
        <View style={styles.titleLine}>
          <Text style={styles.name} numberOfLines={1}>{runtime.name}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <View style={styles.statusLine}>
          <StatusDot tone={reachabilityTone(reachability)} size={7} />
          <Text style={styles.status} numberOfLines={1}>{[describeReachability(reachability), detail].filter(Boolean).join(" · ")}</Text>
        </View>
      </View>
    </>
  );
}

const createStyles = (theme: Theme) => ({
  texts: { flex: 1, minWidth: 0, gap: 2 },
  titleLine: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
  name: { ...type.body, color: theme.colors.text, flexShrink: 1 },
  badge: { ...type.footnote, color: theme.colors.textMuted },
  statusLine: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
  status: { ...type.footnote, color: theme.colors.textMuted, flexShrink: 1 }
});
