import type { AppToast } from "@/components/app/types/appToast.types";
import { Toast, ToastDescription, ToastTitle } from "@/components/ui/toast";

export function AppToastStack({ toasts, onDismiss }: { toasts: AppToast[]; onDismiss: (id: number) => void }) {
  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          open
          variant={toast.variant}
          onOpenChange={(open) => {
            if (!open) {
              onDismiss(toast.id);
            }
          }}
        >
          <div className="space-y-1">
            <ToastTitle>{toast.title}</ToastTitle>
            {toast.description ? <ToastDescription>{toast.description}</ToastDescription> : null}
          </div>
        </Toast>
      ))}
    </>
  );
}
