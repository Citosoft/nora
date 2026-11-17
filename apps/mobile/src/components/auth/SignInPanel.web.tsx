import { SignIn } from "@clerk/expo/web";
import { View } from "react-native";
import { radii } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";

const systemFont = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';

/** Web: Clerk's own sign-in component (hash routing, so the static SPA needs no extra routes), themed to match the app. */
export function SignInPanel() {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center" }}>
      <SignIn routing="hash" appearance={{
        variables: {
          colorPrimary: colors.accent, colorForeground: colors.text, colorMutedForeground: colors.textMuted, colorBackground: colors.surface,
          colorInput: colors.fill, colorInputForeground: colors.text, fontFamily: systemFont, fontSize: "16px", borderRadius: `${radii.sm}px`
        },
        elements: {
          rootBox: { width: "100%" },
          cardBox: { width: "100%", boxShadow: "none", borderRadius: `${radii.xl}px` },
          card: { boxShadow: "none" },
          formButtonPrimary: { borderRadius: `${radii.pill}px`, height: "48px", fontSize: "17px", fontWeight: 600, textTransform: "none" }
        }
      }} />
    </View>
  );
}
