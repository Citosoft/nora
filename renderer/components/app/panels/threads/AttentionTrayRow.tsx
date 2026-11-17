import { useState } from "react";
import { ChevronDown, Ellipsis, LoaderCircle } from "lucide-react";
import { AppMark } from "@/components/app/shared/AppMark";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { compactApprovalActions } from "@/components/app/logic/approvalActions";
import { inlineQuestion } from "@/components/app/logic/attentionToasts";
import type { RequestResponse } from "@shared/types/conversation/contracts.types";
import type { AttentionTrayRowProps } from "@/components/app/types/attentionToasts.types";

/** One waiting request as a single row: who and what, the command or choices beneath, and its main actions on the right. */
export function AttentionTrayRow({ toast, onRespond, onOpen, onDismiss }: AttentionTrayRowProps) {
  const { request, conversation, notice } = toast;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async (response: RequestResponse): Promise<void> => {
    if (busy) return;
    setBusy(true); setError(null);
    try { await onRespond(response); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The response could not be sent. Try again."); }
    finally { setBusy(false); }
  };
  const approval = request.kind === "approval" ? compactApprovalActions(request.options) : null;
  const question = inlineQuestion(request);
  const approve = (optionId: string): void => { void send({ kind: "approval", optionId }); };
  const detail = request.kind === "approval" ? request.details?.command ?? request.details?.paths?.join(", ") ?? request.details?.target ?? null : null;
  const subline = detail ?? (question ? question.options.join(" · ") : request.kind === "question" ? "Needs an answer in its thread" : notice.body);
  const menu = <DropdownMenu widthClassName="w-56" trigger={<Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground" disabled={busy}
    aria-label={`More actions for ${notice.title}`}><Ellipsis className="size-3.5" aria-hidden="true" /></Button>}>
    {approval?.more.map(({ option, intent }) => <DropdownMenuItem key={option.id} destructive={intent === "cancel"} onSelect={() => approve(option.id)}>{option.label}</DropdownMenuItem>)}
    <DropdownMenuItem onSelect={onOpen}>Open thread</DropdownMenuItem>
    <DropdownMenuItem onSelect={onDismiss}>Hide (keeps waiting)</DropdownMenuItem>
  </DropdownMenu>;
  return <li className="px-3 py-2">
    <div className="flex items-center gap-2.5">
      {conversation.bot ? <BotAvatar avatar={conversation.bot.avatar} state="waiting" size={22} className="shrink-0" />
        : <span className="flex size-[22px] shrink-0 items-center justify-center"><AppMark className="size-4" /></span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium" title={`${notice.title}: ${notice.body}`}>{notice.who} · {question ? question.text : request.title}</p>
        <p className={`truncate text-xs text-muted-foreground ${detail ? "font-mono text-[11px]" : ""}`} title={subline}>{subline}</p>
      </div>
      {busy && <LoaderCircle className="size-3.5 shrink-0 text-muted-foreground motion-safe:animate-spin" aria-label="Sending" />}
      {approval ? <>
        {approval.decline && <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs text-muted-foreground" disabled={busy}
          onClick={() => approval.decline && approve(approval.decline.option.id)}>{approval.decline.option.label}</Button>}
        {approval.allow && <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 border border-primary/80 bg-primary px-2.5 text-xs text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" disabled={busy}
          title={approval.allow.option.description} onClick={() => approval.allow && approve(approval.allow.option.id)}>{approval.allow.option.label}</Button>}
      </> : question ? <DropdownMenu widthClassName="w-48" trigger={<Button type="button" variant="outline" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs" disabled={busy}>
          Answer<ChevronDown className="size-3" aria-hidden="true" /></Button>}>
        {question.options.map((option) => <DropdownMenuItem key={option} onSelect={() => void send({ kind: "question", answers: { [question.questionId]: [option] } })}>{option}</DropdownMenuItem>)}
      </DropdownMenu> : <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={onOpen}>Answer</Button>}
      {menu}
    </div>
    {error && <p role="alert" className="mt-1 pl-8 text-xs text-destructive">{error}</p>}
  </li>;
}
