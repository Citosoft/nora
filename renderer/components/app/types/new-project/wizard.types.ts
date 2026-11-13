import type { useProjectScaffold } from "@/components/app/hooks/useProjectScaffold";

export interface WizardStepProps {
  wizard: ReturnType<typeof useProjectScaffold>;
}

export interface ReviewStepProps extends WizardStepProps {
  preferredAgentToolId: string | null;
}
