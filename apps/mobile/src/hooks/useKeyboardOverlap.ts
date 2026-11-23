import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, LayoutAnimation, Platform, type HostInstance, type KeyboardEvent } from "react-native";
import type { KeyboardOverlap } from "@/types/keyboardOverlap.types";

const showEvent = Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

/**
 * How far the on-screen keyboard covers the bottom of a view, measured in window coordinates. React Native's
 * KeyboardAvoidingView compares its parent-relative frame with the keyboard's screen position, so it under-pads any view
 * that sits below a top bar, and on edge-to-edge Android the window no longer resizes for the keyboard at all.
 * Re-measures on layout too, so a window that does resize (overlap shrinks to zero) is never padded twice.
 */
export function useKeyboardOverlap(): KeyboardOverlap {
  const ref = useRef<HostInstance>(null);
  const keyboardTop = useRef<number | null>(null);
  const [overlap, setOverlap] = useState(0);

  const remeasure = useCallback(() => {
    const top = keyboardTop.current;
    if (top === null) return setOverlap(0);
    ref.current?.measureInWindow((_x, y, _width, height) => setOverlap(Math.max(0, Math.round(y + height - top))));
  }, []);

  useEffect(() => {
    const animate = (event: KeyboardEvent): void => {
      if (Platform.OS === "ios" && event.duration > 0) LayoutAnimation.configureNext(LayoutAnimation.create(event.duration, "keyboard", "opacity"));
    };
    const show = Keyboard.addListener(showEvent, (event) => {
      animate(event);
      keyboardTop.current = event.endCoordinates.screenY;
      remeasure();
    });
    const hide = Keyboard.addListener(hideEvent, (event) => {
      animate(event);
      keyboardTop.current = null;
      setOverlap(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [remeasure]);

  return { ref, overlap, remeasure };
}
