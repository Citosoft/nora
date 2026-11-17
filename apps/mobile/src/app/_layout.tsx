import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { AppNavigator } from "@/components/shell/AppNavigator";
import { PreferencesProvider } from "@/context/preferencesContext";
import { ThemeProvider } from "@/context/themeContext";
import { useTheme } from "@/hooks/useTheme";
import { registerServiceWorker } from "@/platform/serviceWorker";

export default function RootLayout() {
  useEffect(registerServiceWorker, []);
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <ThemeProvider>
          <ThemedStatusBar />
          <AuthBoundary>
            <AppNavigator />
          </AuthBoundary>
        </ThemeProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}
