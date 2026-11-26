import path from "node:path";
import type { CommandLaunch, CommandLaunchPlatform } from "@main/types/commandLaunch.types";

const CMD_METACHARACTERS = /([()\][%!^"`<>&|;, *?])/g;

function currentPlatform(): CommandLaunchPlatform {
  return { platform: process.platform, comspec: process.env.ComSpec ?? process.env.comspec };
}

/** True for Windows batch files (npm installs CLIs such as `codex.cmd` this way), which Node cannot spawn without cmd.exe. */
export function isWindowsBatchFile(executable: string, platform: NodeJS.Platform = process.platform): boolean {
  return platform === "win32" && /\.(cmd|bat)$/i.test(executable);
}

function escapeCommand(command: string): string {
  return command.replace(CMD_METACHARACTERS, "^$1");
}

/**
 * Quotes one argument for the Windows C runtime, then caret-escapes it for cmd.exe. Batch shims forward arguments with `%*`,
 * which cmd parses a second time, so the escaping is applied twice (the same rules cross-spawn uses for npm shims).
 */
function escapeArgument(argument: string): string {
  const quoted = `"${argument.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\*)$/, "$1$1")}"`;
  return quoted.replace(CMD_METACHARACTERS, "^$1").replace(CMD_METACHARACTERS, "^$1");
}

/**
 * Plans how to start `executable` with `args`. Batch files run through cmd.exe with every argument escaped, so paths with
 * spaces and arguments with quotes or shell metacharacters arrive unchanged; everything else is spawned directly. Pass the
 * result's `windowsVerbatimArguments` through to `spawn`/`execFile` and never combine it with `shell`.
 */
export function commandLaunch(executable: string, args: readonly string[], host: CommandLaunchPlatform = currentPlatform()): CommandLaunch {
  if (!isWindowsBatchFile(executable, host.platform)) return { command: executable, args: [...args], windowsVerbatimArguments: false };
  const commandLine = [escapeCommand(path.win32.normalize(executable)), ...args.map(escapeArgument)].join(" ");
  return { command: host.comspec || "cmd.exe", args: ["/d", "/s", "/c", `"${commandLine}"`], windowsVerbatimArguments: true };
}
