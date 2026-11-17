import { Image, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Theme } from "@/types/theme.types";
import { brandImages } from "@/config/brandImages";
import { layout, radii, spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { SignInPanel } from "@/components/auth/SignInPanel";

/** Welcome screen: app icon and pitch centred, sign-in pinned to the bottom like a native onboarding screen. */
export function SignInScreen() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.hero}>
        <Image source={brandImages.appIcon} style={styles.icon} accessibilityIgnoresInvertColors accessible={false} />
        <Text style={styles.title} accessibilityRole="header">Nora</Text>
        <Text style={styles.pitch}>Chat with your agents, follow their progress and approve what they do — from your phone.</Text>
      </View>
      <View style={styles.actions}>
        <SignInPanel />
        <Text style={styles.note}>Sign in with the same account you use in Nora Desktop. Your computers appear automatically.</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: Theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, justifyContent: "space-between" as const, gap: spacing.xxl, width: "100%" as const, maxWidth: 480, alignSelf: "center" as const,
    paddingHorizontal: layout.gutter + spacing.sm },
  hero: { flexGrow: 1, alignItems: "center" as const, justifyContent: "center" as const, gap: spacing.md },
  icon: { width: 96, height: 96, borderRadius: radii.xl, marginBottom: spacing.sm },
  title: { ...type.largeTitle, color: theme.colors.text },
  pitch: { ...type.body, color: theme.colors.textMuted, textAlign: "center" as const, maxWidth: 340 },
  actions: { gap: spacing.md },
  note: { ...type.footnote, color: theme.colors.textMuted, textAlign: "center" as const }
});
