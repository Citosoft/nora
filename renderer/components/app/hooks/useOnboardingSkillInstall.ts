import { useRef, useState } from "react";
import type { OnboardingSkillInstallState } from "@/components/app/types/onboardingSkill.types";

export function useOnboardingSkillInstall(install: () => Promise<void>) {
  const [state, setState] = useState<OnboardingSkillInstallState>({ kind: "idle" });
  const pending = useRef(false);
  const startInstall = async (): Promise<void> => {
    if (pending.current) return;
    pending.current = true;
    setState({ kind: "installing" });
    try {
      await install();
      setState({ kind: "idle" });
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Unable to install the Nora skill. Try again or install it later from Settings → Skills." });
    } finally {
      pending.current = false;
    }
  };
  return { state, startInstall };
}
