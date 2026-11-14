export type TaskFormValues = {
  title: string;
  goal: string;
  context: string;
  definitionOfDone: string;
};

export type TaskCreationRequest = {
  projectId: string;
  contextText?: string;
};

export type CreateTaskDialogProps = {
  projectName: string;
  initialContext: string;
  onClose: () => void;
  onSave: (values: TaskFormValues) => Promise<void>;
};
