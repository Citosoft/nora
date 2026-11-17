import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, PanResponder, Platform, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import type { SidebarProps } from "@/types/sidebar.types";
import type { Theme } from "@/types/theme.types";
import { hairline } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { SidebarContent } from "./SidebarContent";

const useNativeDriver = Platform.OS !== "web";
const maxWidth = 340;

/** ChatGPT-style drawer sliding in from the left over a dimmed screen; tap outside or swipe left to close. */
export function Sidebar(props: SidebarProps) {
  const { visible, onClose } = props;
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width * 0.84, maxWidth);
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver })
        .start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [progress, visible]);

  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => gesture.dx < -8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_event, gesture) => progress.setValue(Math.max(0, Math.min(1, 1 + gesture.dx / panelWidth))),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dx < -panelWidth * 0.3 || gesture.vx < -0.5) onClose();
      else Animated.timing(progress, { toValue: 1, duration: 160, useNativeDriver }).start();
    }
  }), [onClose, panelWidth, progress]);

  if (!mounted) return null;
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] });
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close sidebar" />
      </Animated.View>
      <Animated.View {...swipe.panHandlers} accessibilityViewIsModal style={[styles.panel, { width: panelWidth, transform: [{ translateX }] }]}>
        <SidebarContent {...props} />
      </Animated.View>
    </Modal>
  );
}

const createStyles = (theme: Theme) => ({
  scrim: { backgroundColor: theme.colors.overlay },
  panel: { position: "absolute" as const, top: 0, bottom: 0, left: 0, backgroundColor: theme.colors.sidebar,
    borderRightWidth: hairline, borderRightColor: theme.colors.separator }
});
