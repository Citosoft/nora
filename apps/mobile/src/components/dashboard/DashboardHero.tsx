import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DashboardHeadline } from "@/types/dashboard.types";
import type { Theme } from "@/types/theme.types";
import { layout, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { StatusDot } from "@/components/common/StatusDot";
import { PixelField } from "@/components/visuals/PixelField";

interface DashboardHeroProps {
  greeting: string;
  /** e.g. "Monday 23 November". */
  date: string;
  headline: DashboardHeadline;
}

/** The dashboard's header: today's date, a greeting and a one-line status, over the website's drifting dot terrain. */
export function DashboardHero({ greeting, date, headline }: DashboardHeroProps) {
  const styles = useThemedStyles(createStyles);
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  // Reach up under the translucent navigation bar so the terrain runs to the top of the screen.
  const underBar = insets.top + layout.navBarHeight;
  return (
    <View style={[styles.hero, { marginTop: -underBar, paddingTop: underBar + spacing.xl }]}>
      <PixelField style={styles.terrain} edgeFade={0.1} bottomFade={0.55} intensity={scheme === "dark" ? 0.7 : 0.5} />
      <View style={styles.texts} accessible accessibilityRole="header" accessibilityLabel={`${greeting}. ${date}. ${headline.text}`}>
        <Text style={styles.date}>{date.toUpperCase()}</Text>
        <Text style={styles.greeting} numberOfLines={2}>{greeting}</Text>
        <View style={styles.status}>
          <StatusDot tone={headline.tone} size={8} />
          <Text style={[styles.statusText, headline.tone !== "neutral" && { color: colors.tones[headline.tone].text }]} numberOfLines={2}>{headline.text}</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  hero: { minHeight: 236, justifyContent: "flex-end" as const, paddingBottom: spacing.lg },
  // The terrain keeps to the space above the greeting so the text always sits on clean ground.
  terrain: { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: "42%" as const },
  texts: { paddingHorizontal: layout.gutter + spacing.xs, gap: spacing.xs },
  date: { ...type.eyebrow, color: theme.colors.textMuted },
  greeting: { ...type.display, color: theme.colors.text },
  status: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, marginTop: spacing.xxs },
  statusText: { ...type.subheadline, color: theme.colors.textMuted, flexShrink: 1 }
});
