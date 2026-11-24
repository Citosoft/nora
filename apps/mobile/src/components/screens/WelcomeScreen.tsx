import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Animated, Platform, ScrollView, Text, View, useWindowDimensions, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Theme } from "@/types/theme.types";
import { layout, spacing, type } from "@/theme/tokens";
import { onboardingSlides, signInGlyph } from "@/config/onboardingSlides";
import { pixelGlyphs } from "@/visuals/pixelGlyphs";
import { usePreferences } from "@/hooks/usePreferences";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Button } from "@/components/common/Button";
import { NavButton } from "@/components/common/NavButton";
import { PageDots } from "@/components/onboarding/PageDots";
import { SignInActions } from "@/components/onboarding/SignInActions";
import { WelcomeBackdrop } from "@/components/onboarding/WelcomeBackdrop";
import { WelcomePage } from "@/components/onboarding/WelcomePage";
import { WelcomeText } from "@/components/onboarding/WelcomeText";
import { PixelGlyph } from "@/components/visuals/PixelGlyph";

const pageCount = onboardingSlides.length + 1;
const lastPage = pageCount - 1;

/**
 * First open: a few swipeable pages over the website's drifting dot terrain, ending on sign-in. Once seen, the app opens
 * straight on the sign-in page and the intro stays a swipe away.
 */
export function WelcomeScreen() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { preferences, update } = usePreferences();
  const [index, setIndex] = useState(() => (preferences.onboardingCompleted ? lastPage : 0));
  // Where the pager opens. Fixed after the first render: handing iOS a new `contentOffset` while a page slides in
  // interrupts the slide and leaves the pager stuck between pages.
  const [openingOffset] = useState(() => ({ x: index * width, y: 0 }));
  const [footerHeight, setFooterHeight] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(height);
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollX = useRef(new Animated.Value(index * width)).current;
  const heroHeight = Math.round(Math.min(height * 0.48, 440));
  // The sign-in page keeps a shorter hero so the form sits higher, with its own terrain; the shared one stops where the intro artwork ends.
  const signInHeroHeight = Math.round(heroHeight * 0.7);
  const [terrainHeight, setTerrainHeight] = useState(heroHeight + insets.top);
  // Short phones (iPhone SE and similar) get smaller glyphs so every page fits on one screen.
  const glyphCell = pagerHeight < 760 ? 9 : 13;

  const onScroll = useMemo(() => Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: Platform.OS !== "web",
    listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width));
      setIndex((current) => (current === page ? current : Math.min(Math.max(page, 0), lastPage)));
    }
  }), [scrollX, width]);

  // Keep the current page in place when the window resizes (rotation, desktop browsers); only a width change re-anchors it.
  useEffect(() => {
    pager.current?.scrollTo({ x: index * width, animated: false });
  }, [width]);

  useEffect(() => {
    if (index === lastPage && !preferences.onboardingCompleted) void update((current) => ({ ...current, onboardingCompleted: true }));
  }, [index, preferences.onboardingCompleted, update]);

  const goTo = (page: number): void => pager.current?.scrollTo({ x: page * width, animated: true });
  const onFooterLayout = (event: LayoutChangeEvent): void => setFooterHeight(event.nativeEvent.layout.height);
  const onPagerLayout = (event: LayoutChangeEvent): void => setPagerHeight(event.nativeEvent.layout.height);
  const onLast = index === lastPage;

  return (
    <View style={styles.screen}>
      <WelcomeBackdrop scrollX={scrollX} pageWidth={width} pageCount={pageCount} height={terrainHeight} />
      <Animated.ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} bounces={false} onScroll={onScroll}
        scrollEventThrottle={16} contentOffset={openingOffset} style={styles.pager} onLayout={onPagerLayout}>
        {onboardingSlides.map((slide, page) => (
          <WelcomePage key={slide.id} width={width} height={pagerHeight} heroHeight={heroHeight + insets.top} glyph={slide.glyph} glyphCell={glyphCell}
            active={index === page} bottomInset={footerHeight} {...(page === 0 ? { onHeroLayout: setTerrainHeight } : {})}>
            <WelcomeText eyebrow={slide.eyebrow} title={slide.title} body={slide.body} />
          </WelcomePage>
        ))}
        <WelcomePage width={width} height={pagerHeight} heroHeight={signInHeroHeight + insets.top} glyph={signInGlyph} glyphCell={glyphCell} active={onLast}
          terrain bottomInset={footerHeight}>
          <WelcomeText eyebrow="Get started" title="Sign in to Nora" body="Use your Nora Desktop account, or create one as you sign in." />
          <SignInActions />
        </WelcomePage>
      </Animated.ScrollView>

      <View style={[styles.topBar, { paddingTop: insets.top }]} pointerEvents="box-none">
        <View style={styles.leading}>
          {index > 0 ? <View style={styles.back}><NavButton icon="chevron-back" label="Back" onPress={() => goTo(index - 1)} /></View> : null}
          {/* The sign-in page's hero already shows the N, so the small mark steps aside there. */}
          {onLast ? null : (
            <View style={styles.brand} accessible accessibilityRole="header" accessibilityLabel="Nora">
              <PixelGlyph bitmap={pixelGlyphs.mark} cell={3} />
              <Text style={styles.brandText}>Nora</Text>
            </View>
          )}
        </View>
        {onLast ? null : <NavButton label="Skip" onPress={() => goTo(lastPage)} />}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]} onLayout={onFooterLayout} pointerEvents="box-none">
        <View style={styles.footerColumn}>
          <PageDots count={pageCount} scrollX={scrollX} pageWidth={width} index={index} />
          {onLast ? null : <Button label="Continue" variant="primary" onPress={() => goTo(index + 1)} />}
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background, overflow: "hidden" as const },
  pager: { flex: 1 },
  topBar: { position: "absolute" as const, top: 0, left: 0, right: 0, flexDirection: "row" as const, alignItems: "center" as const,
    justifyContent: "space-between" as const, paddingHorizontal: layout.gutter + spacing.xs, minHeight: layout.navBarHeight },
  // The back chevron slides in beside the mark from the second page on.
  leading: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.xs, minHeight: layout.navBarHeight },
  // Pull the chevron out to the edge so the mark doesn't jump far right when it appears.
  back: { marginLeft: -spacing.md },
  brand: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, height: layout.navBarHeight },
  brandText: { ...type.headline, color: theme.colors.text },
  footer: { position: "absolute" as const, left: 0, right: 0, bottom: 0, paddingTop: spacing.md, backgroundColor: theme.colors.background },
  footerColumn: { width: "100%" as const, maxWidth: 480, alignSelf: "center" as const, paddingHorizontal: layout.gutter + spacing.sm, gap: spacing.lg }
});
