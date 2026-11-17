import { createContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import type { Theme } from "@/types/theme.types";
import { palettes } from "@/theme/tokens";
import { usePreferences } from "@/hooks/usePreferences";

export const ThemeContext = createContext<Theme>({ scheme: "dark", colors: palettes.dark });

/** Resolves the theme from the user's preference, following the system when set to "system". */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const { preferences } = usePreferences();
  const scheme = preferences.theme === "system" ? (system === "light" ? "light" : "dark") : preferences.theme;
  const theme = useMemo<Theme>(() => ({ scheme, colors: palettes[scheme] }), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
