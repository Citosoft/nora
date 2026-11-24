import { StyleSheet, View } from "react-native";
import type { Theme } from "@/types/theme.types";
import { layout, spacing } from "@/theme/tokens";
import { pixelGlyphs } from "@/visuals/pixelGlyphs";
import { useElapsed } from "@/hooks/useElapsed";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { reloadApp } from "@/platform/reloadApp";
import { StateView } from "@/components/common/StateView";
import { DemoEntry } from "@/components/demo/DemoEntry";
import { PixelField } from "@/components/visuals/PixelField";
import { PixelGlyph } from "@/components/visuals/PixelGlyph";

const slowAfterMs = 15_000;

/** Clerk is starting: the pixel mark over the drifting terrain; if that takes too long (offline, blocked script) say so instead. */
export function AuthLoading() {
  const styles = useThemedStyles(createStyles);
  const slow = useElapsed(true, slowAfterMs);
  return (
    <View style={styles.screen}>
      <PixelField style={StyleSheet.absoluteFill} edgeFade={0} bottomFade={0.3} intensity={0.6} />
      {slow ? (
        <View style={styles.slow}>
          <StateView kind="error" title="Can't reach the sign-in service"
            message="Check your internet connection. If you use a content blocker, allow Nora's sign-in (Clerk) scripts."
            {...(reloadApp ? { onRetry: reloadApp } : {})} />
          <DemoEntry />
        </View>
      ) : (
        <View style={styles.mark} accessible accessibilityLabel="Starting Nora" accessibilityLiveRegion="polite">
          <PixelGlyph bitmap={pixelGlyphs.mark} cell={12} still />
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background, justifyContent: "center" as const },
  // Centred exactly like the native splash N (same size), so the hand-over from splash to app is seamless.
  mark: { alignItems: "center" as const },
  slow: { width: "100%" as const, maxWidth: 480, alignSelf: "center" as const, paddingHorizontal: layout.gutter + spacing.sm, gap: spacing.lg }
});
