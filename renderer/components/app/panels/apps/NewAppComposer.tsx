import { ArrowUp } from "lucide-react";
import { formatShortcutKeys, shortcutPlatform } from "@/components/app/logic/keyboardShortcuts";
import { NativeProviderPicker } from "@/components/app/panels/conversations/NativeProviderPicker";
import { ThreadWorkspacePicker } from "@/components/app/panels/threads/ThreadWorkspacePicker";
import type { NewAppComposerProps } from "@/components/app/types/appsView.types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppConnectorPicker } from "./AppConnectorPicker";

const PLACEHOLDER = "A customer dashboard: my HubSpot contacts, open Xero invoices with the total outstanding, and a button to create a support ticket…";
const SUBMIT_SHORTCUT = `${formatShortcutKeys(["mod"], shortcutPlatform())}↵`;

/** Where a new app starts: the description, the connectors it may use, and which workspace and model build it. */
export function NewAppComposer({ draft, autoFocus = false }: NewAppComposerProps) {
  const { workspace, boot } = draft;
  const submit = (): void => { void draft.launch().catch(() => undefined); };
  const canSubmit = !!draft.text.trim() && !draft.busy && !!workspace;
  return <form aria-label="New app" onSubmit={(event) => { event.preventDefault(); submit(); }}
    className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-[border-color,box-shadow] focus-within:border-ring/40 focus-within:shadow-md">
    <label htmlFor="new-app-description" className="sr-only">What should the app show and do?</label>
    <Textarea variant="embedded" autoFocus={autoFocus} id="new-app-description" rows={4} placeholder={PLACEHOLDER} value={draft.text} onChange={(event) => draft.setText(event.target.value)}
      onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); submit(); } }}
      className="min-h-[8.5rem] resize-none px-5 pb-2 pt-4 text-[15px] leading-6" />
    <div className="border-t border-border/60 bg-muted/20 px-5 py-3.5"><AppConnectorPicker draft={draft} /></div>
    {draft.error && <p role="alert" className="border-t border-destructive/20 bg-destructive/5 px-5 py-2.5 text-xs text-destructive">{draft.error}</p>}
    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-3 py-2.5">
      {workspace && <ThreadWorkspacePicker workspace={workspace} workspaces={boot.workspaces} disabled={draft.busy} onSelect={draft.selectWorkspace} />}
      {workspace && <NativeProviderPicker state={boot} workspace={workspace} client={draft.client} locked={null} initial={null} onBinding={draft.setProvider} />}
      <div className="ml-auto flex items-center gap-3">
        <kbd className="hidden rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground sm:inline-block" aria-hidden="true">{SUBMIT_SHORTCUT}</kbd>
        <Button type="submit" disabled={!canSubmit} className="gap-1.5 rounded-lg pl-3.5 pr-3">
          {draft.busy ? "Starting…" : "Build app"}<ArrowUp className="size-3.5" aria-hidden="true" /></Button>
      </div>
    </div>
  </form>;
}
