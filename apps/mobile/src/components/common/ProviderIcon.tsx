import { Image } from "react-native";
import type { ProviderKind } from "@shared/types/provider/providerKind.types";
import { radii } from "@/theme/tokens";
import { providerPresentations } from "@/config/providerIcons";

/** The logo of the agent a chat runs on (Claude, Codex, …), sized to sit where a row's icon goes. */
export function ProviderIcon({ kind, size = 22 }: { kind: ProviderKind; size?: number }) {
  const { label, source } = providerPresentations[kind];
  return <Image source={source} accessibilityLabel={label} resizeMode="contain" style={{ width: size, height: size, borderRadius: Math.min(radii.sm, size / 4) }} />;
}
