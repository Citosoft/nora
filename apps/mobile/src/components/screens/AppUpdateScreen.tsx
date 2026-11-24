import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppUpdateScreenProps } from "@/types/appUpdate.types";
import type { Theme } from "@/types/theme.types";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { pixelGlyphs } from "@/visuals/pixelGlyphs";
import { PixelField } from "@/components/visuals/PixelField";
import { PixelGlyph } from "@/components/visuals/PixelGlyph";
import { layout, radii, spacing, type } from "@/theme/tokens";
import { describeAppUpdate } from "@/state/appUpdatePresentation";
import { Button } from "@/components/common/Button";

export function AppUpdateScreen({ state, onInstall, onDismiss }: AppUpdateScreenProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const busy = state.kind === "downloading" || state.kind === "restarting";
  const copy = describeAppUpdate(state);
  return <View style={styles.screen}>
    <PixelField style={[StyleSheet.absoluteFill, styles.terrain]} edgeFade={0} bottomFade={0.5} intensity={0.55} />
    <ScrollView style={styles.fill} contentContainerStyle={[styles.content,
    { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
    <View style={styles.hero} accessibilityLiveRegion="polite">
      <View style={styles.mark}><PixelGlyph bitmap={pixelGlyphs.mark} cell={12} /></View>
      <Text style={styles.title} accessibilityRole="header">{copy.title}</Text>
      <Text style={styles.message}>{copy.message}</Text>
      {busy ? <ActivityIndicator size="large" color={colors.accent} /> : null}
      {state.kind === "downloading" && state.progress !== null ? <View style={styles.progress} accessibilityRole="progressbar"
        accessibilityLabel="Downloading update" accessibilityValue={{ min: 0, max: 100, now: Math.round(state.progress * 100) }}>
        <View style={[styles.progressFill, { width: `${state.progress * 100}%` }]} />
      </View> : null}
    </View>
    <View style={styles.actions}>
      {!busy ? <Button label={copy.actionLabel} variant="primary" onPress={onInstall} /> : null}
      {copy.dismissible ? <Button label="Not now" variant="ghost" onPress={onDismiss} /> : null}
      <Text style={styles.note}>Your agents keep working on your computer while Nora updates.</Text>
    </View>
  </ScrollView>
  </View>;
}

const createStyles = (theme: Theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  fill: { flex: 1 },
  terrain: { bottom: "45%" as const },
  content: { flexGrow: 1, gap: spacing.xxl, width: "100%" as const, maxWidth: 480, alignSelf: "center" as const, paddingHorizontal: layout.gutter + spacing.sm },
  hero: { flexGrow: 1, alignItems: "center" as const, justifyContent: "center" as const, gap: spacing.lg },
  mark: { marginBottom: spacing.lg },
  title: { ...type.largeTitle, color: theme.colors.text, textAlign: "center" as const },
  message: { ...type.body, color: theme.colors.textMuted, textAlign: "center" as const },
  actions: { gap: spacing.sm },
  note: { ...type.footnote, color: theme.colors.textMuted, textAlign: "center" as const },
  progress: { width: "100%" as const, height: spacing.xs + 2, borderRadius: radii.pill, backgroundColor: theme.colors.fill, overflow: "hidden" as const },
  progressFill: { height: "100%" as const, backgroundColor: theme.colors.accent }
});
