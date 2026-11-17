import { View } from "react-native";
import { StateView } from "@/components/common/StateView";
import { useElapsed } from "@/hooks/useElapsed";
import { useTheme } from "@/hooks/useTheme";
import { reloadApp } from "@/platform/reloadApp";

const slowAfterMs = 15_000;

/** Clerk is starting; if that takes too long (offline, blocked script) say so instead of spinning forever. */
export function AuthLoading() {
  const { colors } = useTheme();
  const slow = useElapsed(true, slowAfterMs);
  return (
    <View style={{ flex: 1, backgroundColor: colors.groupedBackground, justifyContent: "center" }}>
      {slow ? (
        <StateView kind="error" title="Can't reach the sign-in service"
          message="Check your internet connection. If you use a content blocker, allow Nora's sign-in (Clerk) scripts."
          {...(reloadApp ? { onRetry: reloadApp } : {})} />
      ) : <StateView kind="loading" message="Starting Nora…" />}
    </View>
  );
}
