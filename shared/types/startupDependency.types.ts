export type StartupDependencyId =
  | "git"
  | "npm"
  | "npx"
  | "ssh-client"
  | "ssh-mount";

export type StartupDependencySeverity = "mandatory" | "optional";

export type StartupDependencyStatus = "available" | "missing";

export interface StartupDependency {
  id: StartupDependencyId;
  label: string;
  severity: StartupDependencySeverity;
  status: StartupDependencyStatus;
  summary: string;
  detectedPath: string | null;
  installHint: string | null;
  canAutoInstall: boolean;
  autoInstallLabel: string | null;
  manualInstructions: string[];
}

export interface StartupDependencyReport {
  checkedAt: string;
  dependencies: StartupDependency[];
}
