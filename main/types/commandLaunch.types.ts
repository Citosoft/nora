/** How to start a CLI with `spawn`/`execFile`: the program, its arguments, and whether Node must pass them verbatim. */
export interface CommandLaunch {
  command: string;
  args: string[];
  windowsVerbatimArguments: boolean;
}

export interface CommandLaunchPlatform {
  platform: NodeJS.Platform;
  /** The Windows command interpreter (`%ComSpec%`), used to run batch shims. */
  comspec?: string;
}
