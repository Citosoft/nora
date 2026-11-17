import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Theme } from "@/types/theme.types";
import { monospaceFont, radii, spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";

/** Shown instead of sign-in when the build has no Clerk publishable key, so a misconfigured deploy explains itself. */
export function ConfigurationMissing() {
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card} accessibilityRole="alert">
        <Text style={styles.title} accessibilityRole="header">Nora isn't set up yet</Text>
        <Text style={styles.body}>
          This copy of the Nora web app was built without its sign-in configuration, so it can't connect to your account.
        </Text>
        <Text style={styles.body}>If you deployed it yourself, set this variable and rebuild:</Text>
        <Text style={styles.code} selectable>EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_…</Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => ({
  safe: { flex: 1, backgroundColor: theme.colors.groupedBackground, alignItems: "center" as const, justifyContent: "center" as const, padding: spacing.lg },
  card: { maxWidth: 480, width: "100%" as const, backgroundColor: theme.colors.surface, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.md },
  title: { ...type.title2, color: theme.colors.text },
  body: { ...type.body, color: theme.colors.textMuted },
  code: { fontFamily: monospaceFont, fontSize: 13, color: theme.colors.text, backgroundColor: theme.colors.fill, padding: spacing.md, borderRadius: radii.sm }
});
