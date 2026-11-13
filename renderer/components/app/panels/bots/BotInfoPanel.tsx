import * as Dialog from "@radix-ui/react-dialog";
import { MessageSquarePlus, Pencil, Trash2, X } from "lucide-react";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Button } from "@/components/ui/button";
import { ThreadRow } from "@/components/app/panels/threads/ThreadRow";
import { BotMemorySection } from "@/components/app/panels/settings/bots/BotMemorySection";
import { BOT_ORIGIN_LABELS } from "@/components/app/constants/botOrigins";
import { BotInfoSection } from "./BotInfoSection";
import type { BotInfoPanelProps } from "@/components/app/types/botNavigation.types";

const RECENT_THREADS = 5;

/**
 * A side panel beside the Bots sidebar: who the bot is, the model it runs on, its instructions and notes, and its recent threads and groups.
 * Non-modal so the sidebar stays usable; opening a thread from here keeps the panel open.
 */
export function BotInfoPanel({ info, workspace, workspaces, now, onStart, onOpen, onTogglePin, onEdit, onDelete, onClose }: BotInfoPanelProps) {
  const { item, bot: { bot, origin, overrides }, provider, groups } = info;
  const details: readonly (readonly [string, string])[] = [
    ["Model", `${provider} · ${bot.binding.model}${bot.binding.reasoning ? ` · ${bot.binding.reasoning} reasoning` : ""}`],
    ["Available", `${BOT_ORIGIN_LABELS[origin]}${overrides.length ? ` (overrides ${overrides.map((entry) => BOT_ORIGIN_LABELS[entry].toLocaleLowerCase()).join(" and ")})` : ""}`],
    ["Threads", `${item.threads.length} in this workspace`]
  ];
  const threadRow = (row: (typeof item.threads)[number]) => <ThreadRow key={row.id} row={row} now={now} workspace={null} request={null} onOpen={onOpen} onTogglePin={onTogglePin} />;
  return <Dialog.Root open modal={false} onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Content aria-describedby={undefined} onInteractOutside={(event) => event.preventDefault()} onOpenAutoFocus={(event) => event.preventDefault()}
        className="fixed bottom-0 right-0 top-0 z-[29990] flex w-[min(380px,100vw)] flex-col border-l bg-card shadow-panel outline-none">
        <div className="flex items-start gap-3 px-5 pb-4 pt-5">
          <BotAvatar avatar={bot.avatar} state={item.state} size={52} label={bot.name} />
          <div className="min-w-0 flex-1">
            <Dialog.Title className="truncate text-base font-semibold">{bot.name}</Dialog.Title>
            {bot.role && <p className="text-sm text-muted-foreground">{bot.role}</p>}
          </div>
          <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Close bot info"><X className="size-4" aria-hidden="true" /></Button></Dialog.Close>
        </div>
        <div className="flex gap-2 px-5 pb-4">
          <Button type="button" size="sm" className="gap-1.5" onClick={onStart}><MessageSquarePlus className="size-3.5" aria-hidden="true" />New thread</Button>
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={onEdit}><Pencil className="size-3.5" aria-hidden="true" />Edit</Button>
          <Button type="button" variant="ghost" size="sm" className="ml-auto gap-1.5 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="size-3.5" aria-hidden="true" />Delete</Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <BotInfoSection title="Details">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
              {details.map(([label, value]) => <div key={label} className="contents"><dt className="text-muted-foreground">{label}</dt><dd className="break-words">{value}</dd></div>)}
            </dl>
          </BotInfoSection>
          <BotInfoSection title="Instructions">
            {bot.instructions ? <p className="whitespace-pre-wrap break-words text-sm">{bot.instructions}</p>
              : <p className="text-sm text-muted-foreground">No standing instructions.</p>}
          </BotInfoSection>
          <section className="border-t px-5 py-4">
            <BotMemorySection botId={bot.id} botName={bot.name} workspaces={workspaces} currentWorkspace={workspace} disabled={false} />
          </section>
          <BotInfoSection title="Recent threads">
            {item.threads.length ? <div className="space-y-0.5">{item.threads.slice(0, RECENT_THREADS).map((row) => threadRow({ ...row, bot: null, providerKind: null }))}</div>
              : <p className="text-sm text-muted-foreground">No threads with {bot.name} yet.</p>}
          </BotInfoSection>
          {groups.length > 0 && <BotInfoSection title="Groups">
            <div className="space-y-0.5">{groups.map(threadRow)}</div>
          </BotInfoSection>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
