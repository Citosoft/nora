export type OnboardingSkillInstallState =
  | { kind: "idle" }
  | { kind: "installing" }
  | { kind: "error"; message: string };

export interface OnboardingSkillStepProps {
  installed: boolean;
  available: boolean;
  state: OnboardingSkillInstallState;
  onInstall: () => void;
}
