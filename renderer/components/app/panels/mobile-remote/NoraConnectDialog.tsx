import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { NORA_CONNECT_NAME, NORA_CONNECT_STEPS } from "@/components/app/constants/noraConnect";
import { Button } from "@/components/ui/button";
import { NoraConnectDiagram } from "./NoraConnectDiagram";

/** Opens from the Mobile page to explain, with a diagram, how Nora Connect reaches this computer from a phone. */
export function NoraConnectDialog() {
  return <Dialog.Root>
    <Dialog.Trigger asChild>
      <button type="button" className="font-medium text-primary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none">How {NORA_CONNECT_NAME} works</button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/80 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] max-h-[90vh] w-[min(760px,92vw)] -translate-x-1/2 -translate-y-1/2 space-y-5 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-panel">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Dialog.Title className="text-lg font-semibold">How {NORA_CONNECT_NAME} works</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">{NORA_CONNECT_NAME} is what lets the Nora app on your phone reach this computer: your account’s directory of computers, a Cloudflare tunnel and the apps at each end.</Dialog.Description>
          </div>
          <Dialog.Close asChild><Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Close"><X className="size-4" aria-hidden="true" /></Button></Dialog.Close>
        </div>
        <NoraConnectDiagram />
        <ol className="grid gap-3 sm:grid-cols-2">
          {NORA_CONNECT_STEPS.map((step, index) => <li key={step.title} className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground" aria-hidden="true">{index + 1}</span>
            <span className="space-y-0.5"><span className="block text-sm font-medium">{step.title}</span><span className="block text-xs leading-relaxed text-muted-foreground">{step.body}</span></span>
          </li>)}
        </ol>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
