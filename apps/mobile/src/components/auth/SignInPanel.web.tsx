import { SignIn } from "@clerk/expo/web";
import { View } from "react-native";
import { radii } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";

const systemFont = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';

/** Web: Clerk's own sign-in component (hash routing, so the static SPA needs no extra routes), themed to match the app. Sign-up runs inside it too (`withSignUp`), so creating an account keeps this page's look instead of leaving for Clerk's hosted page. */
export function SignInPanel() {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center" }}>
      <SignIn routing="hash" withSignUp appearance={{
        variables: {
          colorPrimary: colors.accent, colorForeground: colors.text, colorMutedForeground: colors.textMuted, colorBackground: colors.surface,
          colorInput: colors.fill, colorInputForeground: colors.text, fontFamily: systemFont, fontSize: "16px", borderRadius: `${radii.sm}px`
        },
        elements: {
          rootBox: { width: "100%" },
          // A light frosted panel so the page (and its terrain) shows through, instead of an opaque card.
          cardBox: { width: "100%", boxShadow: "none", borderRadius: `${radii.xl}px`, background: colors.glassFill,
            border: `1px solid ${colors.cardBorder}`, backdropFilter: "blur(20px)" },
          // Tighter than Clerk's default so the whole sign-in page fits on a phone screen without scrolling.
          card: { boxShadow: "none", background: "transparent", padding: "20px 20px 16px", gap: "16px" },
          footer: { background: "transparent", marginTop: "-8px" },
          footerItem: { padding: "8px 0" },
          main: { gap: "16px" },
          socialButtonsBlockButton: { height: "40px" },
          formButtonPrimary: { borderRadius: `${radii.pill}px`, height: "44px", fontSize: "17px", fontWeight: 600, textTransform: "none" },
          // The welcome page already titles this step.
          header: { display: "none" }
        }
      }} />
    </View>
  );
}
