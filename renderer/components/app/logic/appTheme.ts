import type { AccentColor, ResolvedTheme, ThemeMode } from "@/components/app/types";

const ACCENT_PALETTES: Record<AccentColor, Record<ResolvedTheme, {
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  ring: string;
  buttonDefaultBg: string;
  buttonDefaultBorder: string;
  buttonDefaultHover: string;
  bodyGradientA: string;
  bodyGradientB: string;
}>> = {
  silver: {
    light: {
      primary: "220 9% 46%",
      primaryForeground: "0 0% 100%",
      accent: "220 10% 93%",
      accentForeground: "220 28% 14%",
      ring: "220 9% 46%",
      buttonDefaultBg: "220 10% 91%",
      buttonDefaultBorder: "220 9% 76%",
      buttonDefaultHover: "220 10% 87%",
      bodyGradientA: "rgba(148, 163, 184, 0.14)",
      bodyGradientB: "rgba(71, 85, 105, 0.08)"
    },
    dark: {
      primary: "220 11% 74%",
      primaryForeground: "220 35% 11%",
      accent: "220 14% 17%",
      accentForeground: "210 20% 94%",
      ring: "220 11% 74%",
      buttonDefaultBg: "220 16% 25%",
      buttonDefaultBorder: "220 12% 40%",
      buttonDefaultHover: "220 17% 29%",
      bodyGradientA: "rgba(148, 163, 184, 0.12)",
      bodyGradientB: "rgba(255, 255, 255, 0.03)"
    }
  },
  green: {
    light: {
      primary: "161 67% 37%",
      primaryForeground: "0 0% 100%",
      accent: "168 35% 92%",
      accentForeground: "220 28% 14%",
      ring: "161 67% 37%",
      buttonDefaultBg: "161 55% 92%",
      buttonDefaultBorder: "161 40% 78%",
      buttonDefaultHover: "161 50% 88%",
      bodyGradientA: "rgba(58, 174, 131, 0.14)",
      bodyGradientB: "rgba(88, 137, 244, 0.1)"
    },
    dark: {
      primary: "153 74% 64%",
      primaryForeground: "150 40% 8%",
      accent: "0 0% 14%",
      accentForeground: "210 20% 94%",
      ring: "153 74% 64%",
      buttonDefaultBg: "153 28% 22%",
      buttonDefaultBorder: "153 42% 34%",
      buttonDefaultHover: "153 30% 26%",
      bodyGradientA: "rgba(98, 227, 168, 0.1)",
      bodyGradientB: "rgba(255, 255, 255, 0.035)"
    }
  },
  blue: {
    light: {
      primary: "213 79% 47%",
      primaryForeground: "0 0% 100%",
      accent: "214 80% 94%",
      accentForeground: "220 28% 14%",
      ring: "213 79% 47%",
      buttonDefaultBg: "214 85% 92%",
      buttonDefaultBorder: "214 67% 77%",
      buttonDefaultHover: "214 80% 88%",
      bodyGradientA: "rgba(55, 122, 233, 0.14)",
      bodyGradientB: "rgba(62, 175, 143, 0.08)"
    },
    dark: {
      primary: "211 96% 68%",
      primaryForeground: "221 47% 12%",
      accent: "218 34% 16%",
      accentForeground: "210 20% 94%",
      ring: "211 96% 68%",
      buttonDefaultBg: "217 41% 23%",
      buttonDefaultBorder: "214 59% 38%",
      buttonDefaultHover: "217 41% 27%",
      bodyGradientA: "rgba(93, 160, 255, 0.13)",
      bodyGradientB: "rgba(255, 255, 255, 0.03)"
    }
  },
  amber: {
    light: {
      primary: "32 95% 45%",
      primaryForeground: "24 35% 12%",
      accent: "40 92% 92%",
      accentForeground: "24 35% 12%",
      ring: "32 95% 45%",
      buttonDefaultBg: "41 90% 90%",
      buttonDefaultBorder: "38 72% 73%",
      buttonDefaultHover: "40 88% 86%",
      bodyGradientA: "rgba(235, 163, 51, 0.14)",
      bodyGradientB: "rgba(194, 95, 43, 0.08)"
    },
    dark: {
      primary: "38 96% 64%",
      primaryForeground: "28 58% 10%",
      accent: "32 18% 16%",
      accentForeground: "42 50% 92%",
      ring: "38 96% 64%",
      buttonDefaultBg: "33 37% 23%",
      buttonDefaultBorder: "34 56% 37%",
      buttonDefaultHover: "33 39% 27%",
      bodyGradientA: "rgba(255, 191, 82, 0.13)",
      bodyGradientB: "rgba(255, 255, 255, 0.03)"
    }
  },
  rose: {
    light: {
      primary: "346 78% 47%",
      primaryForeground: "0 0% 100%",
      accent: "343 78% 94%",
      accentForeground: "220 28% 14%",
      ring: "346 78% 47%",
      buttonDefaultBg: "343 74% 92%",
      buttonDefaultBorder: "344 55% 79%",
      buttonDefaultHover: "343 72% 88%",
      bodyGradientA: "rgba(225, 74, 109, 0.14)",
      bodyGradientB: "rgba(238, 162, 94, 0.08)"
    },
    dark: {
      primary: "343 82% 69%",
      primaryForeground: "345 45% 11%",
      accent: "340 20% 15%",
      accentForeground: "210 20% 94%",
      ring: "343 82% 69%",
      buttonDefaultBg: "340 29% 22%",
      buttonDefaultBorder: "341 43% 35%",
      buttonDefaultHover: "340 31% 26%",
      bodyGradientA: "rgba(247, 115, 148, 0.12)",
      bodyGradientB: "rgba(255, 255, 255, 0.03)"
    }
  },
  violet: {
    light: {
      primary: "262 73% 54%",
      primaryForeground: "0 0% 100%",
      accent: "263 68% 94%",
      accentForeground: "220 28% 14%",
      ring: "262 73% 54%",
      buttonDefaultBg: "264 75% 92%",
      buttonDefaultBorder: "263 56% 80%",
      buttonDefaultHover: "264 72% 88%",
      bodyGradientA: "rgba(123, 92, 245, 0.14)",
      bodyGradientB: "rgba(77, 155, 245, 0.08)"
    },
    dark: {
      primary: "263 92% 74%",
      primaryForeground: "258 49% 12%",
      accent: "257 22% 16%",
      accentForeground: "210 20% 94%",
      ring: "263 92% 74%",
      buttonDefaultBg: "258 30% 24%",
      buttonDefaultBorder: "260 43% 38%",
      buttonDefaultHover: "258 32% 28%",
      bodyGradientA: "rgba(167, 139, 250, 0.13)",
      bodyGradientB: "rgba(255, 255, 255, 0.03)"
    }
  }
};

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyAccentColor(accentColor: AccentColor, resolvedTheme: ResolvedTheme): void {
  const palette = ACCENT_PALETTES[accentColor][resolvedTheme];
  const bodyGradientA = resolvedTheme === "light" ? "transparent" : palette.bodyGradientA;
  const bodyGradientB = resolvedTheme === "light" ? "transparent" : palette.bodyGradientB;
  const root = document.documentElement;
  root.dataset.accent = accentColor;
  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--primary-foreground", palette.primaryForeground);
  root.style.setProperty("--accent", palette.accent);
  root.style.setProperty("--accent-foreground", palette.accentForeground);
  root.style.setProperty("--ring", palette.ring);
  root.style.setProperty("--button-default-bg", palette.buttonDefaultBg);
  root.style.setProperty("--button-default-border", palette.buttonDefaultBorder);
  root.style.setProperty("--button-default-hover", palette.buttonDefaultHover);
  root.style.setProperty("--body-gradient-a", bodyGradientA);
  root.style.setProperty("--body-gradient-b", bodyGradientB);
}

export function applyTheme(mode: ThemeMode, accentColor: AccentColor): ResolvedTheme {
  const resolved = mode === "system" ? getSystemTheme() : mode;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  root.classList.toggle("dark", resolved === "dark");
  applyAccentColor(accentColor, resolved);
  return resolved;
}

export function resolveThemeMode(mode: ThemeMode, currentResolvedTheme: ResolvedTheme): ResolvedTheme {
  return mode === "system" ? currentResolvedTheme : mode;
}
