import { ArrowUp, Check, ChevronLeft, CircleDot, Laptop, ShieldQuestion } from "lucide-react";
import type { CSSProperties } from "react";
import { MOBILE_REMOTE_DEMO_BOTS } from "@/components/app/constants/mobileRemoteDemo";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import type { MobileRemoteDemoBubbleProps, MobileRemoteDemoHeaderProps, MobileRemoteDemoProps } from "@/components/app/types/remoteAccess.types";

const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

function Header({ title, back = false }: MobileRemoteDemoHeaderProps) {
  return <div className="flex shrink-0 items-center gap-1.5 border-b border-border/60 px-4 pb-2.5 pt-1">
    {back ? <ChevronLeft className="size-4 text-primary" /> : <Laptop className="size-4 text-muted-foreground" />}
    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{title}</span>
    {!back && <span className="flex items-center gap-1 text-[10px] text-emerald-500"><span className="size-1.5 rounded-full bg-emerald-500" />Connected</span>}
  </div>;
}

function Bubble({ from, children, at }: MobileRemoteDemoBubbleProps) {
  return <div className={`mobile-remote-in max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-snug ${from === "you" ? "self-end rounded-br-md bg-primary text-primary-foreground" : "self-start rounded-bl-md bg-muted"}`} style={delay(at)}>{children}</div>;
}

const THREADS = [
  { title: "Fix flaky checkout test", state: "Working…", tone: "working" },
  { title: "Draft v2.1 release notes", state: "Needs you", tone: "waiting" },
  { title: "Upgrade Electron to 39", state: "Done · 12m", tone: "done" },
  { title: "Tidy auth middleware", state: "Done · 1h", tone: "done" }
] as const;

function ThreadsScreen() {
  return <>
    <Header title="MacBook Pro" />
    <div className="flex-1 space-y-1.5 overflow-hidden px-3 py-3">
      <p className="mobile-remote-in px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Threads</p>
      {THREADS.map((thread, index) => <div key={thread.title} className="mobile-remote-in flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-2.5" style={delay(120 + index * 110)}>
        {thread.tone === "done" ? <Check className="size-3.5 shrink-0 text-emerald-500" /> : <CircleDot className={`size-3.5 shrink-0 ${thread.tone === "waiting" ? "text-amber-500" : "text-primary"}`} />}
        <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium">{thread.title}</span>
          <span className={`block text-[10px] ${thread.tone === "waiting" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"} ${thread.tone === "working" ? "text-shimmer" : ""}`}>{thread.state}</span></span>
      </div>)}
    </div>
  </>;
}

function BotsScreen() {
  return <>
    <Header title="MacBook Pro" />
    <div className="flex flex-1 flex-col gap-1.5 overflow-hidden px-3 py-3">
      <p className="mobile-remote-in px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Bots</p>
      {MOBILE_REMOTE_DEMO_BOTS.map((bot, index) => <div key={bot.name} className="mobile-remote-in flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-2" style={delay(120 + index * 110)}>
        <BotAvatar avatar={bot.avatar} state={bot.state} size={28} className="shrink-0" />
        <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium">{bot.name} <span className="font-normal text-muted-foreground">· {bot.role}</span></span>
          <span className={`block truncate text-[10px] ${bot.state === "waiting" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>{bot.status}</span></span>
      </div>)}
      <div className="mobile-remote-in mt-auto flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-2 pr-1.5" style={delay(900)}>
        <BotAvatar avatar={MOBILE_REMOTE_DEMO_BOTS[3].avatar} size={18} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-[11px]">Mock up the new settings page</span>
        <span className="mobile-remote-tap flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground" style={delay(1400)}><ArrowUp className="size-3.5" /></span>
      </div>
    </div>
  </>;
}

function ApproveScreen() {
  return <>
    <Header title="Draft v2.1 release notes" back />
    <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3 py-3">
      <Bubble from="nora" at={100}>Release notes are drafted and checked against the merged PRs.</Bubble>
      <div className="mobile-remote-in space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3" style={delay(500)}>
        <p className="flex items-center gap-1.5 text-[11px] font-medium"><ShieldQuestion className="size-3.5 text-amber-500" />Approval needed</p>
        <p className="rounded-md bg-background/80 px-2 py-1 font-mono text-[10px]">npm run publish:changelog</p>
        <div className="flex gap-1.5">
          <span className="flex-1 rounded-lg border border-border bg-background py-1.5 text-center text-[11px]">Deny</span>
          <span className="mobile-remote-tap flex-1 rounded-lg bg-primary py-1.5 text-center text-[11px] font-medium text-primary-foreground" style={delay(900)}>Approve</span>
        </div>
      </div>
      <p className="mobile-remote-in flex items-center gap-1 self-center text-[10px] text-emerald-600 dark:text-emerald-400" style={delay(2600)}><Check className="size-3" />Approved · publishing</p>
    </div>
  </>;
}

function MessageScreen() {
  return <>
    <Header title="Fix flaky checkout test" back />
    <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3 py-3">
      <Bubble from="nora" at={100}>Found it: a race in the cart fixture. The fix is on <span className="font-mono">fix/checkout-race</span> and the suite passes 50 runs in a row.</Bubble>
      <Bubble from="you" at={1500}>Great, open a PR once CI is green.</Bubble>
      <Bubble from="nora" at={2500}>Will do. I’ll let you know when it’s merged.</Bubble>
    </div>
    <div className="mx-3 mb-2 flex shrink-0 items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-3 pr-1.5">
      <span className="flex-1 text-[11px] text-muted-foreground">Message</span>
      <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"><ArrowUp className="size-3.5" /></span>
    </div>
  </>;
}

function NotifyScreen() {
  return <div className="flex flex-1 flex-col items-center gap-2 px-3 pt-8">
    <p className="mobile-remote-in text-5xl font-light tabular-nums tracking-tight">9:41</p>
    {[
      { title: "PR #128 merged", body: "Fix flaky checkout test is done. CI passed and the branch was merged.", at: 600 },
      { title: "Needs you", body: "Draft v2.1 release notes is waiting for an answer.", at: 1500 }
    ].map((note) => <div key={note.title} className="mobile-remote-in mt-2 w-full rounded-2xl border border-border/60 bg-card/90 p-3 shadow-sm backdrop-blur" style={delay(note.at)}>
      <p className="flex items-center justify-between text-[10px] text-muted-foreground"><span className="font-semibold uppercase tracking-wide">Nora</span>now</p>
      <p className="mt-0.5 text-[11px] font-semibold">{note.title}</p>
      <p className="text-[11px] leading-snug text-muted-foreground">{note.body}</p>
    </div>)}
  </div>;
}

function SceneContent({ scene }: MobileRemoteDemoProps) {
  switch (scene) {
    case "threads": return <ThreadsScreen />;
    case "bots": return <BotsScreen />;
    case "approve": return <ApproveScreen />;
    case "message": return <MessageScreen />;
    case "notify": return <NotifyScreen />;
  }
}

/** One scene of the remote app, played in with staggered entrances. */
export function MobileRemoteDemoScreen({ scene }: MobileRemoteDemoProps) {
  return <div className="flex min-h-0 flex-1 flex-col"><SceneContent scene={scene} /></div>;
}
