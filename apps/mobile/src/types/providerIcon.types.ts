import type { ImageSourcePropType } from "react-native";

/** How a chat's provider is shown: its bundled logo and the name read out by screen readers. */
export interface ProviderPresentation {
  label: string;
  source: ImageSourcePropType;
}
