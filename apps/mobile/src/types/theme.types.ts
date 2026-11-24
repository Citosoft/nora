import type { TextStyle, ViewStyle } from "react-native";
import type { StatusTone } from "./conversationState.types";

export type ColorScheme = "light" | "dark";

/** iOS semantic colours (system backgrounds, labels, fills and separators) plus Nora's monochrome tint. */
export interface ThemeColors {
  /** Plain screens such as a chat (systemBackground). */
  background: string;
  /** Inset grouped screens such as lists and settings (systemGroupedBackground). */
  groupedBackground: string;
  /** Cells and cards on a grouped background (secondarySystemGroupedBackground). */
  surface: string;
  /** Fills behind bubbles, search fields and grey buttons (tertiary fill). */
  fill: string;
  /** Highlight for a pressed row. */
  pressed: string;
  separator: string;
  /** Translucent bars (navigation bar, composer dock, sheets). */
  chrome: string;
  /** The message field's fill. */
  composer: string;
  /** Slide-out sidebar background and its highlighted row. */
  sidebar: string;
  sidebarSelected: string;
  text: string;
  textMuted: string;
  textTertiary: string;
  textInverse: string;
  accent: string;
  accentText: string;
  /** Low-emphasis tinted backgrounds for the accent (tinted buttons, selected chips). */
  accentFill: string;
  danger: string;
  dangerText: string;
  dangerFill: string;
  userBubble: string;
  userBubbleText: string;
  codeBackground: string;
  overlay: string;
  shadow: string;
  /** Alerts and action sheets floating above a dimmed screen. */
  elevated: string;
  /** Hairline border around cards that float above a grouped background. */
  cardBorder: string;
  /** A barely-there tint for see-through panels over artwork (the web sign-in form). */
  glassFill: string;
  /** Fill of search fields (tertiarySystemFill). */
  searchFill: string;
  tones: Record<StatusTone, { background: string; text: string; solid: string }>;
}

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
}

/** A named style map built from the theme; values are plain style objects (RN's `StyleSheet.create` is an identity). */
export type ThemedStyleMap<T> = { [K in keyof T]: ViewStyle | TextStyle };

/** iOS Dynamic Type sizes at the default content size. */
export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle["fontWeight"];
  letterSpacing?: number;
}
