import { useContext } from "react";
import type { Theme } from "@/types/theme.types";
import { ThemeContext } from "@/context/themeContext";

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
