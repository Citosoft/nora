import { Text, View } from "react-native";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";

/** Eyebrow, title and body of a welcome page, shared by the intro pages and the sign-in page. */
export function WelcomeText({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.block}>
      <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  block: { gap: spacing.sm },
  eyebrow: { ...type.eyebrow, color: theme.colors.textMuted },
  title: { ...type.largeTitle, color: theme.colors.text },
  body: { ...type.body, color: theme.colors.textMuted }
});
