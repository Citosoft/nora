import { Animated, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { PixelField } from "@/components/visuals/PixelField";

interface WelcomeBackdropProps {
  /** Horizontal scroll position of the pager, which drifts the terrain sideways for a gentle parallax. */
  scrollX: Animated.Value;
  pageWidth: number;
  pageCount: number;
  height: number;
}

/** How far the terrain slides across the whole pager, as a share of one page. */
const parallax = 0.35;

/** The website's dot terrain behind the intro pages, wider than the screen so it can glide as pages change; it fades out
 * as the sign-in page (which draws its own, shorter terrain) slides in. */
export function WelcomeBackdrop({ scrollX, pageWidth, pageCount, height }: WelcomeBackdropProps) {
  const { scheme } = useTheme();
  const travel = pageWidth * parallax * Math.max(1, pageCount - 1) * 0.5;
  const lastOffset = Math.max(1, (pageCount - 1) * pageWidth);
  const opacity = scrollX.interpolate({ inputRange: [lastOffset - pageWidth, lastOffset], outputRange: [1, 0], extrapolate: "clamp" });
  const translateX = scrollX.interpolate({ inputRange: [0, Math.max(1, (pageCount - 1) * pageWidth)], outputRange: [0, -travel], extrapolate: "clamp" });
  return (
    <Animated.View pointerEvents="none" style={[styles.band, { height, width: pageWidth + travel, opacity, transform: [{ translateX }] }]}>
      <PixelField style={StyleSheet.absoluteFill} edgeFade={0} bottomFade={0.35} intensity={scheme === "dark" ? 1 : 0.85} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({ band: { position: "absolute", top: 0, left: 0 } });
