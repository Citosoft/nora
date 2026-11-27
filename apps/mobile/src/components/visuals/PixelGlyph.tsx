import { memo, useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import type { GlyphCellShape, PixelGlyphProps } from "@/types/pixelField.types";
import { glyphCells, glyphSize } from "@/visuals/pixelGlyphs";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTheme } from "@/hooks/useTheme";

/** Gap between glyph cells as a share of the cell, matching the app icon's spacing. */
const gapRatio = 0.25;
const pixelInMs = 420;
const pixelInEasing = Easing.bezier(0.2, 0.8, 0.2, 1);

/** Horizontal placement within the cell as shares of its edge, and opacity, matching the app icon's diagonal. */
const cellShapes: Readonly<Record<GlyphCellShape, { offset: number; width: number; opacity: number }>> = {
  full: { offset: 0, width: 1, opacity: 1 },
  left: { offset: 2 / 64, width: 28 / 64, opacity: 0.5 },
  right: { offset: 34 / 64, width: 28 / 64, opacity: 0.5 }
};

/** A dot-matrix glyph whose cells pixel in diagonally, like the website's mark. Decorative. */
export function PixelGlyph({ bitmap, cell = 14, color, playKey, still = false }: PixelGlyphProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion() || still;
  const cells = useMemo(() => glyphCells(bitmap), [bitmap]);
  const size = glyphSize(bitmap);
  const pitch = cell * (1 + gapRatio);
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none"
      style={{ width: size.columns * pitch - cell * gapRatio, height: size.rows * pitch - cell * gapRatio }}>
      {cells.map((item) => (
        <GlyphCell key={`${item.column}:${item.row}:${playKey ?? ""}`} left={item.column * pitch} top={item.row * pitch} size={cell} shape={item.shape}
          delayMs={reduced ? 0 : item.delayMs} animate={!reduced} color={color ?? colors.text} />
      ))}
    </View>
  );
}

const GlyphCell = memo(function GlyphCell({ left, top, size, shape, delayMs, animate, color }: { left: number; top: number; size: number; shape: GlyphCellShape; delayMs: number; animate: boolean; color: string }) {
  const progress = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (!animate) return undefined;
    const animation = Animated.timing(progress, { toValue: 1, duration: pixelInMs, delay: delayMs, easing: pixelInEasing, useNativeDriver: Platform.OS !== "web" });
    animation.start();
    return () => animation.stop();
  }, [animate, delayMs, progress]);
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const geometry = cellShapes[shape];
  const opacity = geometry.opacity === 1 ? progress : Animated.multiply(progress, geometry.opacity);
  return <Animated.View style={[styles.cell, { left: left + size * geometry.offset, top, width: size * geometry.width, height: size, borderRadius: size * 0.14 * Math.min(1, geometry.width * 2), backgroundColor: color, opacity, transform: [{ scale }] }]} />;
});

const styles = StyleSheet.create({ cell: { position: "absolute" } });
