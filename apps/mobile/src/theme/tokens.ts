import type { ColorScheme, ThemeColors, TypeStyle } from "@/types/theme.types";

/**
 * Single source of visual tokens for both themes, modelled on iOS system colours so the web app reads as an iPhone app.
 * Components read colours only through `useTheme()`.
 */
export const palettes: Record<ColorScheme, ThemeColors> = {
  light: {
    background: "#FFFFFF",
    groupedBackground: "#F2F2F7",
    surface: "#FFFFFF",
    fill: "#F0F0F0",
    pressed: "#E8E8E8",
    separator: "#D9D9D9",
    chrome: "rgba(255, 255, 255, 0.85)",
    composer: "#F4F4F4",
    sidebar: "#F9F9F9",
    sidebarSelected: "#ECECEC",
    text: "#0D0D0D",
    textMuted: "#6B6B6B",
    textTertiary: "#B4B4B4",
    textInverse: "#FFFFFF",
    accent: "#16946C",
    accentText: "#FFFFFF",
    accentFill: "rgba(22, 148, 108, 0.12)",
    danger: "#FF3B30",
    dangerText: "#FFFFFF",
    dangerFill: "rgba(255, 59, 48, 0.12)",
    userBubble: "#F0F0F0",
    userBubbleText: "#0D0D0D",
    codeBackground: "#F2F2F7",
    overlay: "rgba(0, 0, 0, 0.32)",
    shadow: "rgba(0, 0, 0, 0.08)",
    elevated: "rgba(242, 242, 247, 0.94)",
    tones: {
      neutral: { background: "#EEEEF0", text: "#6D6D72", solid: "#8E8E93" },
      active: { background: "rgba(0, 122, 255, 0.12)", text: "#0A64CC", solid: "#007AFF" },
      attention: { background: "rgba(255, 149, 0, 0.14)", text: "#B25E00", solid: "#FF9500" },
      danger: { background: "rgba(255, 59, 48, 0.12)", text: "#C4251B", solid: "#FF3B30" },
      success: { background: "rgba(52, 199, 89, 0.14)", text: "#1E8A3C", solid: "#34C759" }
    }
  },
  dark: {
    background: "#000000",
    groupedBackground: "#000000",
    surface: "#1C1C1C",
    fill: "#262626",
    pressed: "#2E2E2E",
    separator: "#2A2A2A",
    chrome: "rgba(0, 0, 0, 0.8)",
    composer: "#1F1F1F",
    sidebar: "#000000",
    sidebarSelected: "#1F1F1F",
    text: "#FFFFFF",
    textMuted: "#A1A1A1",
    textTertiary: "#5E5E5E",
    textInverse: "#000000",
    accent: "#3DDC97",
    accentText: "#002B19",
    accentFill: "rgba(61, 220, 151, 0.16)",
    danger: "#FF453A",
    dangerText: "#FFFFFF",
    dangerFill: "rgba(255, 69, 58, 0.18)",
    userBubble: "#2F2F2F",
    userBubbleText: "#FFFFFF",
    codeBackground: "#1A1A1A",
    overlay: "rgba(0, 0, 0, 0.5)",
    shadow: "rgba(0, 0, 0, 0.4)",
    elevated: "rgba(38, 38, 38, 0.96)",
    tones: {
      neutral: { background: "#2C2C2E", text: "#98989F", solid: "#8E8E93" },
      active: { background: "rgba(10, 132, 255, 0.2)", text: "#64A8FF", solid: "#0A84FF" },
      attention: { background: "rgba(255, 159, 10, 0.2)", text: "#FFB340", solid: "#FF9F0A" },
      danger: { background: "rgba(255, 69, 58, 0.2)", text: "#FF6961", solid: "#FF453A" },
      success: { background: "rgba(48, 209, 88, 0.2)", text: "#4ADE7B", solid: "#30D158" }
    }
  }
};

export const spacing = Object.freeze({ xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 });
export const radii = Object.freeze({ xs: 6, sm: 10, md: 14, lg: 18, xl: 24, pill: 999 });

/** iOS text styles (default Dynamic Type size). */
export const type = Object.freeze({
  largeTitle: { fontSize: 30, lineHeight: 36, fontWeight: "600", letterSpacing: -0.4 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: -0.26 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: "600", letterSpacing: -0.45 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.43 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.43 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: "400", letterSpacing: -0.31 },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: "400", letterSpacing: -0.23 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: -0.08 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" }
} satisfies Record<string, TypeStyle>);

export const layout = Object.freeze({
  maxContentWidth: 720,
  minTouchTarget: 44,
  navBarHeight: 52,
  /** Leading inset of grouped content and row separators. */
  gutter: 16,
  rowHeight: 52,
  iconTile: 30,
  composerMaxHeight: 180
});

export const hairline = 0.5;
export const monospaceFont = "ui-monospace, Menlo, SFMono-Regular, Consolas, monospace";
