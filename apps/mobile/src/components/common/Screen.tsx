import { useMemo, useRef, useState } from "react";
import { Animated, Platform, Text, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ScreenProps } from "@/types/navigationUi.types";
import type { Theme } from "@/types/theme.types";
import { layout, spacing, type } from "@/theme/tokens";
import { glassStyle } from "@/platform/glassStyle";
import { useTheme } from "@/hooks/useTheme";
import { useContentWidth } from "@/hooks/useContentWidth";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { NavBar } from "./NavBar";

const largeTitleCollapse = { inputRange: [28, 48], outputRange: [0, 1], extrapolate: "clamp" as const };
const chromeFadeIn = { inputRange: [0, 12], outputRange: [0, 1], extrapolate: "clamp" as const };

/**
 * Page frame modelled on a UIKit navigation stack: a floating frosted bar over scrolling content, an optional large title
 * that collapses into the bar, and an optional dock (composer) pinned above the home indicator.
 */
export function Screen({ title, largeTitle = false, subtitle, back, leading, trailing, variant = "grouped", scroll = true, refreshControl, dock, children }: ScreenProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const maxWidth = useContentWidth();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [dockHeight, setDockHeight] = useState(0);
  const titleOpacity = useMemo(() => (largeTitle && scroll ? scrollY.interpolate(largeTitleCollapse) : 1), [largeTitle, scroll, scrollY]);
  const chromeOpacity = useMemo(() => (scroll ? scrollY.interpolate(chromeFadeIn) : 0), [scroll, scrollY]);
  const onScroll = useMemo(() => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: Platform.OS !== "web" }), [scrollY]);
  const onDockLayout = (event: LayoutChangeEvent): void => setDockHeight(event.nativeEvent.layout.height);
  const background = variant === "grouped" ? colors.groupedBackground : colors.background;
  const barHeight = insets.top + layout.navBarHeight;

  const bar = <NavBar title={title} subtitle={largeTitle ? undefined : subtitle} back={back} leading={leading} trailing={trailing}
    titleOpacity={titleOpacity} chromeOpacity={chromeOpacity} floating={scroll} />;
  const dockView = dock ? (
    <View onLayout={onDockLayout} style={[scroll ? styles.floatingDock : null, scroll ? glassStyle : null, scroll ? styles.dockChrome : { backgroundColor: background },
      { paddingBottom: insets.bottom }]}>
      <View style={[styles.column, { maxWidth }]}>{dock}</View>
    </View>
  ) : null;

  if (!scroll) {
    return (
      <View style={[styles.fill, { backgroundColor: background }]}>
        {bar}
        <View style={[styles.fill, styles.column, { maxWidth }]}>{children}</View>
        {dockView}
      </View>
    );
  }
  return (
    <View style={[styles.fill, { backgroundColor: background }]}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" refreshControl={refreshControl}
        contentContainerStyle={{ paddingTop: barHeight, paddingBottom: (dock ? dockHeight : insets.bottom) + spacing.xxl }}
        scrollIndicatorInsets={{ top: barHeight }}>
        <View style={[styles.column, { maxWidth }]}>
          {largeTitle ? (
            <View style={styles.largeTitleBlock}>
              <Text style={styles.largeTitle} accessibilityRole="header" numberOfLines={2}>{title}</Text>
              {subtitle ? <Text style={styles.largeSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
          ) : <View style={styles.topGap} />}
          <View style={styles.content}>{children}</View>
        </View>
      </Animated.ScrollView>
      {bar}
      {dockView}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  fill: { flex: 1 },
  column: { width: "100%" as const, alignSelf: "center" as const },
  largeTitleBlock: { paddingHorizontal: layout.gutter + spacing.xs, paddingTop: spacing.xs, paddingBottom: spacing.md },
  largeTitle: { ...type.largeTitle, color: theme.colors.text },
  largeSubtitle: { ...type.subheadline, color: theme.colors.textMuted, marginTop: spacing.xxs },
  topGap: { height: spacing.sm },
  content: { gap: spacing.xl },
  floatingDock: { position: "absolute" as const, left: 0, right: 0, bottom: 0 },
  dockChrome: { backgroundColor: theme.colors.chrome }
});
