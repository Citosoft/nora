export const APP_RUNTIME_SETTINGS = {
  main: {
    squirrelWindowLifetimeMs: 1_000,
    stateBroadcastIntervalMs: 50,
    devAnalyticsSwitch: "enable-dev-analytics",
    maxImportedImageBytes: 10 * 1024 * 1024,
    externalUrlAllowedProtocols: ["https:"]
  },
  orchestrator: {
    maxInstallLogLines: 120,
    maxWorkspaceSearchResults: 50,
    maxWorkspaceGitStatusLines: 200,
    remoteSshCommandTimeoutMs: 20_000,
    localGitCommandTimeoutMs: 15_000,
    vercelApiTimeoutMs: 15_000
  }
} as const;
