import { Animated, View } from "react-native";
import type { Theme } from "@/types/theme.types";
import { spacing } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";

interface PageDotsProps {
  count: number;
  scrollX: Animated.Value;
  pageWidth: number;
  index: number;
}

const dotSize = 7;

/** Page indicator that follows the swipe: each square dot brightens and grows as its page slides in. */
export function PageDots({ count, scrollX, pageWidth, index }: PageDotsProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row} accessible accessibilityRole="adjustable" accessibilityLabel={`Page ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, page) => {
        const inputRange = [(page - 1) * pageWidth, page * pageWidth, (page + 1) * pageWidth];
        const opacity = scrollX.interpolate({ inputRange, outputRange: [0.25, 1, 0.25], extrapolate: "clamp" });
        const scale = scrollX.interpolate({ inputRange, outputRange: [1, 1.35, 1], extrapolate: "clamp" });
        return <Animated.View key={page} style={[styles.dot, { opacity, transform: [{ scale }] }]} />;
      })}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  row: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: spacing.sm + 2, height: spacing.xl },
  dot: { width: dotSize, height: dotSize, borderRadius: 1.5, backgroundColor: theme.colors.text }
});
