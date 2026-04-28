export type UserIdentitySource =
  | "git-local"
  | "git-global"
  | "os-display"
  | "os-username"
  | "unknown";

export interface DetectedUserIdentity {
  displayName: string | null;
  source: UserIdentitySource;
}
