import { useRef, useState } from "react";
import { Field } from "@/components/app/shared/Field";
import type { CreateTaskDialogProps, TaskFormValues } from "@/components/app/types/taskCreation.types";
import { Button } from "@/components/ui/button";
import * as Dialog from "@radix-ui/react-dialog";
import { DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateTaskDialog({ projectName, initialContext, onClose, onSave }: CreateTaskDialogProps) {
  const [values, setValues] = useState<TaskFormValues>({ title: "", goal: "", context: initialContext, definitionOfDone: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const updateField = (field: keyof TaskFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };
  const close = () => {
    if (!savingRef.current) onClose();
  };

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] -translate-x-1/2 -translate-y-1/2 focus:outline-none">
          <DialogContent headerTitle={<Dialog.Title>New task</Dialog.Title>} onClose={close}>
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={async (event) => {
              event.preventDefault();
              if (!values.title.trim() || savingRef.current) return;
              savingRef.current = true;
              setIsSaving(true);
              setError(null);
              try {
                await onSave(values);
              } catch (cause: unknown) {
                setError(cause instanceof Error ? cause.message : "Unable to create the task. Please try again.");
              } finally {
                savingRef.current = false;
                setIsSaving(false);
              }
            }}>
              <DialogHeader>
                <Dialog.Description className="text-sm text-muted-foreground">Create a task in {projectName}. The task is saved when you choose Create task.</Dialog.Description>
              </DialogHeader>
              <DialogBody className="space-y-4">
                <Field label="Title">
                  <Input autoFocus required disabled={isSaving} value={values.title} onChange={(event) => updateField("title", event.target.value)} placeholder="What needs to be done?" />
                </Field>
                <Field label="Goal">
                  <Textarea disabled={isSaving} value={values.goal} onChange={(event) => updateField("goal", event.target.value)} placeholder="Describe the desired outcome." className="min-h-20" />
                </Field>
                <Field label="Context">
                  <Textarea disabled={isSaving} value={values.context} onChange={(event) => updateField("context", event.target.value)} placeholder="Add relevant links, files, or constraints." className="min-h-24" />
                </Field>
                <Field label="Definition of done">
                  <Textarea disabled={isSaving} value={values.definitionOfDone} onChange={(event) => updateField("definitionOfDone", event.target.value)} placeholder="Explain what success looks like." className="min-h-20" />
                </Field>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={isSaving} onClick={close}>Cancel</Button>
                <Button type="submit" disabled={isSaving || !values.title.trim()}>{isSaving ? "Creating task…" : "Create task"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
