const TERMINAL_ESCAPE_PATTERN = /(?:\u001b|\u241b)(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
const TERMINAL_OSC_PATTERN = /(?:\u001b|\u241b)\][^\u0007]*(?:\u0007|(?:\u001b|\u241b)\\)/g;

export function stripTerminalControlSequences(value: string): string {
  return value
    .replace(TERMINAL_OSC_PATTERN, "")
    .replace(TERMINAL_ESCAPE_PATTERN, "");
}

export function formatInstallLogText(lines: string[]): string {
  return stripTerminalControlSequences(lines.join("\n"));
}
