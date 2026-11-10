import { useEffect, useId, useRef, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNativeConversationPorts } from "@/components/app/hooks/useNativeConversationPorts";
import { useNativeConversation } from "@/components/app/hooks/useNativeConversation";
import { useThreadInsights } from "@/components/app/hooks/useThreadInsights";
import { roleProfile } from "@shared/personalization/profiles";
import { getGreetingFirstName } from "@/components/app/logic/thread-workspace/greeting";
import { ThreadWorkspacePicker } from "../threads/ThreadWorkspacePicker";
import { ThreadCheckoutPicker } from "../threads/ThreadCheckoutPicker";
import { NativeProviderPicker } from "./NativeProviderPicker";
import { NativeTimeline } from "./NativeTimeline";
import { NativeRequest } from "./NativeRequest";
import { NativeQueue } from "./NativeQueue";
import { ThreadInsightsPanel } from "./ThreadInsightsPanel";

export function NativeConversationPanel() {
  const ports = useNativeConversationPorts();
  const { client, document, workspace, runtime, setText, setBinding, submit, execute } = ports;
  const conversationId = document.target.kind === "thread" ? document.target.conversationId : null;
  const { view, error: loadError, older, reload } = useNativeConversation({ client, conversationId });
  const messageId = useId();
  const transcript = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const follow = useRef(true);
  const [newActivity, setNewActivity] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(true);
  const header = view?.header;
  const insights = useThreadInsights({ header, items: view?.items ?? [], workspace, hasOlderHistory: !!view?.nextBefore, readBranchRequest: ports.readBranchRequest });
  const active = header?.activeRuns[0];
  const role = header?.conversation.role?.selection ?? document.role;
  const profile = role ? roleProfile(role) : null;
  const firstName = getGreetingFirstName(ports.userDisplayName);
  const pending = document.pending;
  const busy = runtime.busy;
  const archived = !!header?.conversation.archivedAt;
  const canSend = !busy && !archived && (!conversationId || !!header)
    && (!!pending || (!!runtime.readyBinding && !!document.text.trim()));
  const jumpToLatest = (): void => {
    follow.current = true; setNewActivity(false);
    transcript.current?.scrollTo({ top: transcript.current.scrollHeight });
  };
  useEffect(() => {
    if (follow.current) transcript.current?.scrollTo({ top: transcript.current.scrollHeight });
    else setNewActivity(true);
  }, [view?.items]);
  const chooseStarter = (text: string): void => { setText(text); composer.current?.focus(); };
  return <section className="thread-conversation flex min-h-0 min-w-0 flex-1 flex-col" aria-label={conversationId ? "Thread" : "New thread"}>
    <div className="relative flex min-h-0 flex-1 flex-col" data-thread-insights={header ? insightsExpanded ? "expanded" : "collapsed" : undefined}>
    {header && <ThreadInsightsPanel header={header} changes={insights.changes} request={insights.request} expanded={insightsExpanded} busy={busy}
      canArchive={!active && !header.queuedRuns.length && !archived} hasOlderHistory={!!view?.nextBefore}
      onToggle={() => setInsightsExpanded((current) => !current)} onRefresh={insights.refresh} onLoadHistory={() => void older()}
      onArchive={() => void execute({ kind: "archive", commandId: crypto.randomUUID(), conversationId: header.conversation.id })} />}
    <div className="thread-transcript min-h-0 flex-1 overflow-y-auto px-5 py-7" ref={transcript} onScroll={() => { const element = transcript.current;
      if (element) follow.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100; }}>
      <div className="mx-auto max-w-[800px] space-y-5 text-[15px]">
        {loadError && <div role="alert"><p>{loadError}</p><Button onClick={reload}>Reload thread</Button></div>}
        {view?.nextBefore && <Button variant="ghost" onClick={() => void older()}>Load older messages</Button>}
        {conversationId && !view && !loadError && <p className="text-muted-foreground">Loading thread…</p>}
        {view && <NativeTimeline items={view.items} />}
        {!conversationId && <div className="mx-auto flex max-w-xl flex-col items-center gap-7 pb-6 pt-[clamp(2rem,12vh,9rem)] text-center">
          <div className="space-y-3"><p className="text-xs font-medium text-muted-foreground">{profile?.label ?? "Your workspace"}</p>
            <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">What would you like to work on{firstName && <>, <span className="text-blue-600 dark:text-blue-400">{firstName}</span></>}?</h1></div>
          <div className="flex flex-wrap justify-center gap-2">{profile?.starters.map((starter) => <Button key={starter} variant="outline" className="h-auto max-w-full rounded-full px-4 py-2 text-left font-normal whitespace-normal"
            disabled={!!pending} onClick={() => chooseStarter(starter)}>{starter}</Button>)}</div>
        </div>}
      </div>
    </div>
    </div>
    {newActivity && <Button variant="secondary" size="sm" className="mx-auto mb-3 rounded-full" onClick={jumpToLatest}><ArrowDown className="size-3.5" aria-hidden="true" />Jump to latest</Button>}
    <div className="mx-auto w-full max-w-[848px] space-y-3 px-4 pb-5 sm:px-6">
      {header && <NativeQueue conversationId={header.conversation.id} runs={header.queuedRuns} paused={header.conversation.queuePaused} busy={busy} execute={execute} />}
      {header?.pendingRequests.map((request) => <NativeRequest key={request.id} request={request} busy={busy} onRespond={(response) => execute({ kind: "respond", commandId: crypto.randomUUID(), conversationId: header.conversation.id, requestId: request.id, response })} />)}
      {active && <div className="flex items-center justify-between gap-3 text-sm"><span role="status">{active.state.replaceAll("-", " ")}</span>
        <Button size="sm" variant="outline" disabled={busy || active.state === "stopping"} onClick={() => void execute({ kind: active.state === "recovering" ? "reconcile" : "interrupt", commandId: crypto.randomUUID(), conversationId: active.conversationId, runId: active.id })}>{active.state === "recovering" ? "Check native status" : "Interrupt"}</Button></div>}
      {(runtime.error || ports.storageError || pending) && <p role="alert" className="text-sm text-destructive">{runtime.error ?? ports.storageError ?? "Delivery is unconfirmed. Retry checks the same saved instruction."}</p>}
      <form className="space-y-2 rounded-2xl border bg-card p-3 shadow-sm focus-within:ring-1 focus-within:ring-ring/30" onSubmit={(event) => { event.preventDefault(); if (canSend) void submit(); }}>
        <label htmlFor={messageId} className="sr-only">Message Nora</label><Textarea ref={composer} id={messageId} variant="embedded" className="min-h-24 max-h-72 resize-y px-2" value={pending?.submit.instruction ?? document.text} disabled={!!pending || archived}
          placeholder={archived ? "This thread is archived" : active ? "Queue your next instruction…" : "Ask, plan, or start something…"} onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); if (canSend) void submit(); } }} />
        <div className="flex flex-wrap items-center gap-1 border-t pt-2">
          <ThreadWorkspacePicker workspace={workspace} workspaces={ports.state.workspaces} disabled={!!conversationId || !!pending || busy} onSelect={ports.selectWorkspace} />
          <ThreadCheckoutPicker workspace={workspace} workspaces={ports.state.workspaces} disabled={!!conversationId || !!pending || busy} onSelect={ports.selectWorkspace} />
          <span className="ml-auto truncate px-2 text-xs text-muted-foreground" title={workspace.workspace.environmentId}>{workspace.workspace.environmentId}</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1"><NativeProviderPicker key={workspace.id} state={ports.state} workspace={workspace} client={client}
            initial={document.provider} locked={header?.conversation.provider ?? (conversationId ? document.provider : pending?.create?.provider) ?? null} onBinding={setBinding} /></div>
          <Button type="submit" size={pending ? "sm" : "icon"} className="shrink-0 rounded-xl" disabled={!canSend}
            aria-label={busy ? "Sending instruction" : pending ? "Retry saved instruction" : active ? "Queue instruction" : "Send instruction"}>
            {pending ? "Retry saved instruction" : <ArrowUp className="size-4" aria-hidden="true" />}</Button>
        </div>
      </form>
    </div>
  </section>;
}
