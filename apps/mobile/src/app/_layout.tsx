import { DemoModeProvider } from "@/context/demoModeContext";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppUpdateBoundary } from "@/components/updates/AppUpdateBoundary";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { AppNavigator } from "@/components/shell/AppNavigator";
import { PreferencesProvider } from "@/context/preferencesContext";
import { ThemeProvider } from "@/context/themeContext";
import { useTheme } from "@/hooks/useTheme";
import { registerServiceWorker } from "@/platform/serviceWorker";
import { pushNotifications } from "@/platform/pushNotifications";

export default function RootLayout() {
  useEffect(registerServiceWorker, []);
  useEffect(() => pushNotifications.configure(), []);
  return (
    <SafeAreaProvider>
      <DemoModeProvider>
        <PreferencesProvider>
          <ThemeProvider>
            <ThemedStatusBar />
            <AppUpdateBoundary>
              <AuthBoundary>
                <AppNavigator />
              </AuthBoundary>
            </AppUpdateBoundary>
          </ThemeProvider>
        </PreferencesProvider>
      </DemoModeProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}
