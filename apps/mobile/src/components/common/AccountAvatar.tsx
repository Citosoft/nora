import { Image, Text, View } from "react-native";
import type { Theme } from "@/types/theme.types";
import { type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";

/** The signed-in person's photo, or their initials on the accent colour; the same in Settings and the sidebar. */
export function AccountAvatar({ imageUrl, name, size }: { imageUrl: string | null; name: string; size: number }) {
  const styles = useThemedStyles(createStyles);
  const frame = { width: size, height: size, borderRadius: size / 2 };
  if (imageUrl) return <Image source={{ uri: imageUrl }} style={frame} accessibilityIgnoresInvertColors accessible={false} />;
  return (
    <View style={[styles.fallback, frame]} accessible={false}>
      <Text style={[size >= 48 ? styles.large : styles.small]}>{initialsOf(name)}</Text>
    </View>
  );
}

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("") || "N";
}

const createStyles = (theme: Theme) => ({
  fallback: { backgroundColor: theme.colors.accent, alignItems: "center" as const, justifyContent: "center" as const },
  large: { ...type.title3, color: theme.colors.accentText },
  small: { ...type.subheadline, fontWeight: "600" as const, color: theme.colors.accentText }
});
