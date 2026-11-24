import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import type { PixelFieldProps, PixelGrid, PixelTerrainShading } from "@/types/pixelField.types";
import { defaultShading, gridFor, pixelCell, terrainSlidePointsPerSecond, tiledTerrainAlpha } from "@/visuals/pixelTerrain";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTheme } from "@/hooks/useTheme";

/**
 * Below this the website's faint background grid is skipped on native: it doubles the view count for dots you can barely see,
 * and every view costs layout and memory on a phone.
 */
const minimumNativeAlpha = 0.04;

interface FieldCell {
  key: string;
  left: number;
  top: number;
  opacity: number;
}

/**
 * Native: the website's dot terrain as a strip that repeats every screen width, drawn once (two widths long) and slid
 * sideways by one native-driven animation that loops seamlessly. Nothing re-renders while it moves, so the drift never
 * stutters. Side fades would slide with the strip, so only `bottomFade` applies here. Decorative and hidden from accessibility.
 */
export function PixelField({ style, color, intensity = defaultShading.intensity, bottomFade = defaultShading.bottomFade }: PixelFieldProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [grid, setGrid] = useState<PixelGrid>({ columns: 0, rows: 0 });
  const offset = useRef(new Animated.Value(0)).current;
  const shading = useMemo<PixelTerrainShading>(() => ({ intensity, edgeFade: 0, bottomFade }), [bottomFade, intensity]);
  const tileWidth = grid.columns * pixelCell.pitch;

  useEffect(() => {
    if (reduced || tileWidth === 0) return undefined;
    offset.setValue(0);
    const slide = Animated.loop(Animated.timing(offset, {
      toValue: -tileWidth, duration: (tileWidth / terrainSlidePointsPerSecond) * 1000, easing: Easing.linear, useNativeDriver: true
    }));
    slide.start();
    return () => slide.stop();
  }, [offset, reduced, tileWidth]);

  const onLayout = (event: LayoutChangeEvent): void => {
    const next = gridFor(event.nativeEvent.layout.width, event.nativeEvent.layout.height);
    setGrid((current) => (current.columns === next.columns && current.rows === next.rows ? current : next));
  };

  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.field, style]} onLayout={onLayout}>
      <Animated.View style={[styles.strip, { width: tileWidth * 2, transform: [{ translateX: offset }] }]}>
        <Strip grid={grid} shading={shading} color={color ?? colors.text} />
      </Animated.View>
    </View>
  );
}

/** Two tile widths of still dots; re-renders only when the size, shading or colour changes. */
const Strip = memo(function Strip({ grid, shading, color }: { grid: PixelGrid; shading: PixelTerrainShading; color: string }) {
  const cells = useMemo(() => stripCells(grid, shading), [grid, shading]);
  return <>{cells.map((cell) => <View key={cell.key} style={[styles.cell, { left: cell.left, top: cell.top, opacity: cell.opacity, backgroundColor: color }]} />)}</>;
});

function stripCells(grid: PixelGrid, shading: PixelTerrainShading): FieldCell[] {
  const cells: FieldCell[] = [];
  for (let column = 0; column < grid.columns * 2; column++) {
    for (let row = 0; row < grid.rows; row++) {
      const opacity = tiledTerrainAlpha(column, row, grid, shading);
      if (opacity < minimumNativeAlpha) continue;
      cells.push({ key: `${column}:${row}`, left: column * pixelCell.pitch, top: row * pixelCell.pitch, opacity });
    }
  }
  return cells;
}

const styles = StyleSheet.create({
  field: { overflow: "hidden" },
  strip: { position: "absolute", top: 0, bottom: 0, left: 0 },
  cell: { position: "absolute", width: pixelCell.size, height: pixelCell.size, borderRadius: pixelCell.radius }
});
