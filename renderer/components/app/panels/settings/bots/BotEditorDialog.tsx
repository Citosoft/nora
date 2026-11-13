import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { BOT_INSTRUCTIONS_MAX, BOT_NAME_MAX, BOT_ROLE_MAX } from "@shared/bots/contracts";
import { sameBotScope } from "@shared/bots/settingsMutations";
import { sharedBotFileName, SHARED_BOT_DIRECTORY } from "@shared/bots/botFile";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { botEditorDraft, botFromEditorDraft, newBotEditorDraft, templateEditorDraft } from "@/components/app/logic/botEditor";
import { randomBotAvatarSeed } from "@/components/app/logic/bot-avatar/resolve";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProviderModelFields } from "../ProviderModelFields";
import { BotAvatarEditor } from "./BotAvatarEditor";
import { BotScopeFields } from "./BotScopeFields";
import { BotMemorySection } from "./BotMemorySection";
import type { BotEditorDialogProps, BotEditorDraft } from "@/components/app/types/botEditor.types";

/** Mounted per editing session (keyed by the caller), so every opening starts from the saved bot or a fresh draft. */
export function BotEditorDialog({ target, workspace, defaultScope, takenIds, template, onClose }: BotEditorDialogProps) {
  const { boot, request } = useNativeRuntimePorts();
  const existing = target?.bot ?? null;
  const [draft, setDraft] = useState<BotEditorDraft>(() => existing ? botEditorDraft(existing)
    : template ? templateEditorDraft(template, defaultScope, boot.personalization.threadModel ?? null, randomBotAvatarSeed())
    : newBotEditorDraft(defaultScope, boot.personalization.threadModel ?? null, randomBotAvatarSeed()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = (patch: Partial<BotEditorDraft>): void => { setDraft((current) => ({ ...current, ...patch })); setError(null); };
  const leavesRepository = existing?.scope.kind === "workspace" && existing.scope.storage === "shared" && !sameBotScope(existing.scope, draft.scope);
  const save = async (): Promise<void> => {
    const result = botFromEditorDraft(draft, existing, takenIds);
    if (!result.ok) { setError(result.message); return; }
    setBusy(true);
    try { await request({ kind: "save-bot", bot: result.bot, previousScope: existing?.scope ?? null }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The bot could not be saved. Try again."); }
    finally { setBusy(false); }
  };
  const remove = async (): Promise<void> => {
    if (!existing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true);
    try { await request({ kind: "delete-bot", botId: existing.id, scope: existing.scope }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The bot could not be deleted. Try again."); }
    finally { setBusy(false); }
  };
  const modelWorkspace = workspace ?? boot.workspaces[0] ?? null;
  return <Dialog.Root open onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/70 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] flex max-h-[calc(100dvh-3rem)] w-[min(960px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border bg-card shadow-panel outline-none">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="flex items-center justify-between gap-3 px-6 pb-2 pt-5">
            <Dialog.Title className="text-lg font-semibold">{existing ? `Edit ${existing.name}` : template ? `New bot from ${template.role}` : "New bot"}</Dialog.Title>
            <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" aria-label="Close" disabled={busy}><X className="size-4" aria-hidden="true" /></Button></Dialog.Close>
          </div>
          <Dialog.Description className="px-6 text-sm text-muted-foreground">Changes apply to new threads with this bot. Existing threads keep the instructions they started with.</Dialog.Description>
          {/* Who the bot is on the left, what it does (and remembers) on the right; stacked on narrow windows. */}
          <div className="grid min-h-0 flex-1 gap-x-8 gap-y-5 overflow-y-auto px-6 py-5 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div className="space-y-4">
              <BotAvatarEditor avatar={draft.avatar} disabled={busy} onChange={(avatar) => update({ avatar })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm"><span className="font-medium">Name</span>
                  <Input value={draft.name} maxLength={BOT_NAME_MAX} disabled={busy} placeholder="Ada" onChange={(event) => update({ name: event.target.value })} autoFocus /></label>
                <label className="block space-y-1.5 text-sm"><span className="font-medium">Role</span>
                  <Input value={draft.role} maxLength={BOT_ROLE_MAX} disabled={busy} placeholder="Release manager" onChange={(event) => update({ role: event.target.value })} /></label>
              </div>
              <div className="space-y-1.5 text-sm"><span className="font-medium">Model</span>
                {modelWorkspace ? <ProviderModelFields workspace={modelWorkspace.workspace} value={draft.model} disabled={busy} onChange={(model) => update({ model })}
                  labels={{ provider: "Bot provider", model: "Bot model" }} />
                  : <p className="text-sm text-muted-foreground">Add a workspace to choose a model.</p>}</div>
              <BotScopeFields scope={draft.scope} workspace={workspace} botId={existing?.id ?? null} disabled={busy} onChange={(scope) => update({ scope })} />
              {leavesRepository && existing && <p role="status" className="text-xs text-amber-700 dark:text-amber-400">
                Saving removes <code>{SHARED_BOT_DIRECTORY}/{sharedBotFileName(existing.id)}</code> from the workspace. Collaborators who use it will lose this bot.</p>}
            </div>
            <div className="flex min-h-0 flex-col gap-5">
              <label className="flex min-h-0 flex-1 flex-col gap-1.5 text-sm"><span className="font-medium">Instructions</span>
                <Textarea value={draft.instructions} maxLength={BOT_INSTRUCTIONS_MAX} disabled={busy} rows={existing ? 9 : 14} className="min-h-40 flex-1 resize-y"
                  placeholder="Check the changelog and open issues before suggesting a release. Keep answers short and list risks first."
                  onChange={(event) => update({ instructions: event.target.value })} />
                <span className="block text-xs text-muted-foreground">{draft.instructions.length.toLocaleString()} / {BOT_INSTRUCTIONS_MAX.toLocaleString()}</span></label>
              {existing && <BotMemorySection botId={existing.id} botName={existing.name} workspaces={boot.workspaces} currentWorkspace={workspace} disabled={busy} />}
            </div>
            {error && <p role="alert" className="text-sm text-destructive md:col-span-2">{error}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2 border-t bg-muted/45 px-6 py-4">
            {existing && <Button type="button" variant="ghost" className={confirmDelete ? "text-destructive hover:text-destructive" : undefined} disabled={busy} onClick={() => void remove()}>
              {confirmDelete ? `Delete ${existing.name}` : "Delete bot"}</Button>}
            <span className="flex-1" />
            <Dialog.Close asChild><Button type="button" variant="ghost" disabled={busy}>Cancel</Button></Dialog.Close>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : existing ? "Save bot" : "Create bot"}</Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
