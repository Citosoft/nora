import type { ResolvedTheme, TerminalFontId, TerminalThemeId } from "@/components/app/types";
import type { ITheme } from "@xterm/xterm";

export type TerminalPreviewPalette = {
  background: string;
  foreground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
};

const APP_DARK_TERMINAL_THEME = {
  background: "#0a0a0a",
  foreground: "#e5e7eb",
  black: "#1f2937",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#facc15",
  blue: "#60a5fa",
  magenta: "#c084fc",
  cyan: "#22d3ee",
  white: "#f9fafb"
} as const;

const APP_LIGHT_TERMINAL_THEME = {
  background: "#fffdf8",
  foreground: "#1f2937",
  black: "#334155",
  red: "#dc2626",
  green: "#16a34a",
  yellow: "#ca8a04",
  blue: "#2563eb",
  magenta: "#9333ea",
  cyan: "#0891b2",
  white: "#e5e7eb"
} as const;

const TERMINAL_PREVIEW_PALETTES: Record<Exclude<TerminalThemeId, "app">, TerminalPreviewPalette> = {
  "vscode-dark": {
    background: "#1e1e1e",
    foreground: "#d4d4d4",
    black: "#000000",
    red: "#cd3131",
    green: "#0dbc79",
    yellow: "#e5e510",
    blue: "#2472c8",
    magenta: "#bc3fbc",
    cyan: "#11a8cd",
    white: "#e5e5e5"
  },
  dracula: {
    background: "#282a36",
    foreground: "#f8f8f2",
    black: "#21222c",
    red: "#ff5555",
    green: "#50fa7b",
    yellow: "#f1fa8c",
    blue: "#bd93f9",
    magenta: "#ff79c6",
    cyan: "#8be9fd",
    white: "#f8f8f2"
  },
  "solarized-dark": {
    background: "#002b36",
    foreground: "#839496",
    black: "#073642",
    red: "#dc322f",
    green: "#859900",
    yellow: "#b58900",
    blue: "#268bd2",
    magenta: "#d33682",
    cyan: "#2aa198",
    white: "#eee8d5"
  },
  "solarized-light": {
    background: "#fdf6e3",
    foreground: "#657b83",
    black: "#073642",
    red: "#dc322f",
    green: "#859900",
    yellow: "#b58900",
    blue: "#268bd2",
    magenta: "#d33682",
    cyan: "#2aa198",
    white: "#eee8d5"
  }
};

export function normalizeBufferedTerminalOutput(buffer: string): string {
  return buffer.replace(/\r(?!\n)/g, "\r\n");
}

export function getTerminalFontFamily(terminalFontId: TerminalFontId): string {
  switch (terminalFontId) {
    case "jetbrains-mono":
      return "\"JetBrains Mono\", \"IBM Plex Mono\", \"SFMono-Regular\", monospace";
    case "fira-code":
      return "\"Fira Code\", \"IBM Plex Mono\", \"SFMono-Regular\", monospace";
    case "cascadia-mono":
      return "\"Cascadia Mono\", \"Cascadia Code\", \"IBM Plex Mono\", \"SFMono-Regular\", monospace";
    case "source-code-pro":
      return "\"Source Code Pro\", \"IBM Plex Mono\", \"SFMono-Regular\", monospace";
    case "space-mono":
      return "\"Space Mono\", \"IBM Plex Mono\", \"SFMono-Regular\", monospace";
    default:
      return "\"IBM Plex Mono\", \"SFMono-Regular\", monospace";
  }
}

export function getTerminalPreviewPalette(
  terminalThemeId: TerminalThemeId,
  resolvedTheme: ResolvedTheme
): TerminalPreviewPalette {
  if (terminalThemeId === "app") {
    return resolvedTheme === "dark" ? APP_DARK_TERMINAL_THEME : APP_LIGHT_TERMINAL_THEME;
  }

  return TERMINAL_PREVIEW_PALETTES[terminalThemeId];
}

export function resolveTerminalTheme(
  terminalThemeId: TerminalThemeId,
  resolvedTheme: ResolvedTheme,
  rootStyles: CSSStyleDeclaration
): ITheme {
  if (terminalThemeId === "app") {
    const background = `hsl(${rootStyles.getPropertyValue("--background").trim()})`;
    const foreground = `hsl(${rootStyles.getPropertyValue("--foreground").trim()})`;
    const cursor = `hsl(${rootStyles.getPropertyValue("--primary").trim()})`;
    const previewPalette = getTerminalPreviewPalette("app", resolvedTheme);

    return {
      background,
      foreground,
      cursor,
      cursorAccent: background,
      selectionBackground: resolvedTheme === "dark" ? "rgba(121, 192, 255, 0.25)" : "rgba(47, 111, 235, 0.18)",
      black: previewPalette.black,
      red: previewPalette.red,
      green: previewPalette.green,
      yellow: previewPalette.yellow,
      blue: previewPalette.blue,
      magenta: previewPalette.magenta,
      cyan: previewPalette.cyan,
      white: previewPalette.white,
      brightBlack: resolvedTheme === "dark" ? "#6e7681" : "#57606a",
      brightRed: resolvedTheme === "dark" ? "#ffa198" : "#d1242f",
      brightGreen: resolvedTheme === "dark" ? "#56d364" : "#1a7f37",
      brightYellow: resolvedTheme === "dark" ? "#e3b341" : "#9a6700",
      brightBlue: resolvedTheme === "dark" ? "#79c0ff" : "#218bff",
      brightMagenta: resolvedTheme === "dark" ? "#bc8cff" : "#a371f7",
      brightCyan: resolvedTheme === "dark" ? "#39c5cf" : "#3192aa",
      brightWhite: resolvedTheme === "dark" ? "#f0f6fc" : "#24292f"
    };
  }

  const palette = getTerminalPreviewPalette(terminalThemeId, resolvedTheme);
  return {
    background: palette.background,
    foreground: palette.foreground,
    cursor:
      terminalThemeId === "vscode-dark"
        ? "#aeafad"
        : terminalThemeId === "dracula"
          ? "#f8f8f2"
          : terminalThemeId === "solarized-dark"
            ? "#93a1a1"
            : "#586e75",
    cursorAccent: palette.background,
    selectionBackground:
      terminalThemeId === "vscode-dark"
        ? "rgba(173, 214, 255, 0.15)"
        : terminalThemeId === "dracula"
          ? "rgba(255, 255, 255, 0.1)"
          : terminalThemeId === "solarized-dark"
            ? "rgba(147, 161, 161, 0.2)"
            : "rgba(88, 110, 117, 0.18)",
    black: palette.black,
    red: palette.red,
    green: palette.green,
    yellow: palette.yellow,
    blue: palette.blue,
    magenta: palette.magenta,
    cyan: palette.cyan,
    white: palette.white,
    brightBlack:
      terminalThemeId === "vscode-dark"
        ? "#666666"
        : terminalThemeId === "dracula"
          ? "#6272a4"
          : "#002b36",
    brightRed:
      terminalThemeId === "vscode-dark"
        ? "#f14c4c"
        : terminalThemeId === "dracula"
          ? "#ff6e6e"
          : "#cb4b16",
    brightGreen:
      terminalThemeId === "vscode-dark"
        ? "#23d18b"
        : terminalThemeId === "dracula"
          ? "#69ff94"
          : "#586e75",
    brightYellow:
      terminalThemeId === "vscode-dark"
        ? "#f5f543"
        : terminalThemeId === "dracula"
          ? "#ffffa5"
          : "#657b83",
    brightBlue:
      terminalThemeId === "vscode-dark"
        ? "#3b8eea"
        : terminalThemeId === "dracula"
          ? "#d6acff"
          : "#839496",
    brightMagenta:
      terminalThemeId === "vscode-dark"
        ? "#d670d6"
        : terminalThemeId === "dracula"
          ? "#ff92df"
          : "#6c71c4",
    brightCyan:
      terminalThemeId === "vscode-dark"
        ? "#29b8db"
        : terminalThemeId === "dracula"
          ? "#a4ffff"
          : "#93a1a1",
    brightWhite:
      terminalThemeId === "vscode-dark"
        ? "#ffffff"
        : terminalThemeId === "dracula"
          ? "#ffffff"
          : "#fdf6e3"
  };
}
