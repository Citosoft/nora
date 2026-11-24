import { useState, type ReactNode } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PixelBitmap } from "@/types/pixelField.types";
import { layout, spacing } from "@/theme/tokens";
import { glyphSize } from "@/visuals/pixelGlyphs";
import { useTheme } from "@/hooks/useTheme";
import { PixelField } from "@/components/visuals/PixelField";
import { PixelGlyph } from "@/components/visuals/PixelGlyph";

interface WelcomePageProps {
  width: number;
  /** The pager's height; every page fits inside it without scrolling. */
  height: number;
  /** Tallest the artwork area may grow; it gives up space first when the copy and actions need it. */
  heroHeight: number;
  glyph: PixelBitmap;
  /** Largest edge length of the glyph's cells; it shrinks further to fit the space the artwork area ends up with. */
  glyphCell: number;
  /** Replays the glyph's pixel-in each time the page becomes the current one. */
  active: boolean;
  /** Space kept clear at the bottom for the pinned footer. */
  bottomInset: number;
  /** Reports the artwork area's height, so the terrain behind the pager can stop where the copy starts. */
  onHeroLayout?: (height: number) => void;
  /** Draws its own terrain behind the artwork, for a page whose artwork area differs from the shared backdrop's. */
  terrain?: boolean;
  children: ReactNode;
}

const contentWidth = 480;

/** One page of the welcome pager: a pixel glyph over the terrain, then its copy and any actions, all on one screen. */
export function WelcomePage({ width, height, heroHeight, glyph, glyphCell, active, bottomInset, onHeroLayout, terrain = false, children }: WelcomePageProps) {
  // The pinned top bar (back, brand and Skip) sits over the artwork, so the glyph centres in the space below it.
  const topBar = useSafeAreaInsets().top + layout.navBarHeight;
  const { scheme } = useTheme();
  const [heroSpace, setHeroSpace] = useState<number | null>(null);
  const onLayout = (event: LayoutChangeEvent): void => {
    const measured = event.nativeEvent.layout.height;
    setHeroSpace(measured);
    onHeroLayout?.(measured);
  };
  const cell = fittedCell(glyph, glyphCell, heroSpace === null ? null : heroSpace - topBar - spacing.lg * 2);
  return (
    <View style={[styles.page, { width, height, paddingBottom: bottomInset }]} accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}>
      <View style={[styles.hero, { maxHeight: heroHeight, minHeight: topBar, paddingTop: topBar }]} onLayout={onLayout}>
        {terrain ? <PixelField style={StyleSheet.absoluteFill} edgeFade={0} bottomFade={0.35} intensity={scheme === "dark" ? 1 : 0.85} /> : null}
        {cell ? <PixelGlyph bitmap={glyph} cell={cell} playKey={active ? "active" : "idle"} /> : null}
      </View>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

/** Below this the glyph reads as noise, so it is left out rather than drawn tiny. */
const minimumCell = 5;

/** The largest cell size, up to `preferred`, at which the glyph's rows (cells plus quarter-cell gaps) fit `space`; null hides it. */
function fittedCell(glyph: PixelBitmap, preferred: number, space: number | null): number | null {
  if (space === null) return null;
  const { rows } = glyphSize(glyph);
  const fit = Math.floor(space / (rows * 1.25 - 0.25));
  const cell = Math.min(preferred, fit);
  return cell >= minimumCell ? cell : null;
}

const styles = StyleSheet.create({
  page: { overflow: "hidden" },
  hero: { flexGrow: 1, flexShrink: 1, alignItems: "center", justifyContent: "center", overflow: "hidden", paddingBottom: spacing.lg },
  column: { width: "100%", maxWidth: contentWidth, alignSelf: "center", paddingHorizontal: layout.gutter + spacing.sm, gap: spacing.lg }
});
