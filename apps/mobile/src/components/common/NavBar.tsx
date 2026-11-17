import { Animated, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NavBarProps } from "@/types/navigationUi.types";
import type { Theme } from "@/types/theme.types";
import { hairline, layout, spacing, type } from "@/theme/tokens";
import { glassStyle } from "@/platform/glassStyle";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { NavButton } from "./NavButton";

/** iOS navigation bar: glass buttons at the edges, a centred inline title, and a frosted background that fades in on scroll. */
export function NavBar({ title, subtitle, back, leading, trailing, titleOpacity, chromeOpacity, floating }: NavBarProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const goBack = (): void => {
    if (!back) return;
    if (router.canGoBack()) router.back();
    else router.replace(back.fallbackHref);
  };
  return (
    <View style={[styles.bar, { paddingTop: insets.top }, floating && styles.floating]}>
      <Animated.View pointerEvents="none" style={[styles.chrome, glassStyle, { opacity: chromeOpacity }]} />
      <View style={styles.row}>
        <Animated.View pointerEvents="none" style={[styles.titles, { opacity: titleOpacity }]}>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </Animated.View>
        <View style={styles.side}>
          {leading ?? (back ? <NavButton icon="chevron-back" label={`Back to ${back.label}`} onPress={goBack} /> : null)}
        </View>
        <View style={[styles.side, styles.trailing]}>{trailing}</View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  bar: { zIndex: 10 },
  floating: { position: "absolute" as const, top: 0, left: 0, right: 0 },
  chrome: { position: "absolute" as const, top: 0, bottom: 0, left: 0, right: 0, backgroundColor: theme.colors.chrome,
    borderBottomWidth: hairline, borderBottomColor: theme.colors.separator },
  row: { height: layout.navBarHeight, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const,
    paddingHorizontal: layout.gutter, width: "100%" as const, maxWidth: layout.maxContentWidth, alignSelf: "center" as const },
  side: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, minWidth: 38 },
  trailing: { justifyContent: "flex-end" as const },
  titles: { position: "absolute" as const, left: 104, right: 104, top: 0, bottom: 0, alignItems: "center" as const, justifyContent: "center" as const },
  title: { ...type.headline, color: theme.colors.text, textAlign: "center" as const },
  subtitle: { ...type.caption, color: theme.colors.textMuted, textAlign: "center" as const }
});
