import { View } from "react-native";
import { spacing } from "@/theme/tokens";
import { SignInPanel } from "@/components/auth/SignInPanel";
import { DemoEntry } from "@/components/demo/DemoEntry";

/** The welcome pager's last page: sign in, or look around in the offline demo. Compact so it fits one screen. */
export function SignInActions() {
  return (
    <View style={{ gap: spacing.sm }}>
      <SignInPanel />
      <DemoEntry compact />
    </View>
  );
}
