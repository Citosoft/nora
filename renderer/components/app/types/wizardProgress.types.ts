export interface WizardProgressStep<TStep extends string> {
  id: TStep;
  title: string;
}

export interface WizardProgressProps<TStep extends string> {
  ariaLabel: string;
  steps: WizardProgressStep<TStep>[];
  activeStep: TStep;
  onStepChange: (step: TStep) => void;
}
