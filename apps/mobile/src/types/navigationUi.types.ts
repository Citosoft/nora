import type { ReactElement, ReactNode } from "react";
import type { Animated, RefreshControlProps } from "react-native";
import type { IconName } from "./icon.types";

/** A round (icon) or capsule (text) control in a navigation bar or composer. */
export interface NavButtonProps {
  label: string;
  /** Icon-only buttons speak `label`; text buttons show it. */
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** `prominent` fills the button with the tint (iOS "Done"). */
  prominent?: boolean;
}

export interface BackAction {
  /** Spoken as "Back to …". */
  label: string;
  /** Where to go when there is no history to pop (e.g. a deep link opened directly). */
  fallbackHref: string;
}

export type ScreenVariant = "grouped" | "plain";

export interface ScreenProps {
  title: string;
  /** iOS large title that collapses into the bar as the content scrolls. */
  largeTitle?: boolean;
  /** A custom header in place of the large title (e.g. the dashboard greeting); the bar title fades in once it scrolls away. */
  hero?: ReactNode;
  subtitle?: string | undefined;
  back?: BackAction;
  leading?: ReactNode;
  trailing?: ReactNode;
  variant?: ScreenVariant;
  /** `false` when the screen manages its own list/scrolling (chat). */
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  /** Content pinned below the scroll area above the home indicator (e.g. a composer). */
  dock?: ReactNode;
  children: ReactNode;
}

export interface NavBarProps {
  title: string;
  subtitle?: string | undefined;
  back?: BackAction | undefined;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Opacity of the bar's title (large-title screens fade it in once the large title scrolls away). */
  titleOpacity: Animated.AnimatedInterpolation<number> | number;
  /** Opacity of the frosted bar background and hairline (fades in once content scrolls beneath the bar). */
  chromeOpacity: Animated.AnimatedInterpolation<number> | number;
  /** Overlays scrolling content (frosted) instead of sitting above it. */
  floating: boolean;
}
