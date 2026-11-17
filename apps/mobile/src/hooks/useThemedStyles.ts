import { useMemo } from "react";
import type { Theme, ThemedStyleMap } from "@/types/theme.types";
import { useTheme } from "./useTheme";

/** Memoised theme-aware styles so components never hard-code colours. Factories must be module-level functions. */
export function useThemedStyles<T extends ThemedStyleMap<T>>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
