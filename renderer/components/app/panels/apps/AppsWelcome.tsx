import { APP_DIRECTORY_URL } from "@shared/apps/installLink";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { ArrowRight, FileUp, MessageSquare, Plug, SlidersHorizontal } from "lucide-react";
import { APPS_SECTION_ICON } from "@/components/app/constants/appsSectionIcon";
import type { AppsWelcomeProps } from "@/components/app/types/appStarters.types";
import { Button } from "@/components/ui/button";
import { AppWelcomeShowcase } from "./AppWelcomeShowcase";

const STEPS = [
  { icon: Plug, title: "Connect your tools", text: "Use the services you already work with, signed in with your own accounts." },
  { icon: MessageSquare, title: "Describe your idea", text: "A customer dashboard, an inbox, a project tracker. Plain words are enough." },
  { icon: SlidersHorizontal, title: "Make it yours", text: "Ask for changes, move panels around and keep refining by chatting." }
] as const;

/** Introduces Apps before asking a first-time user to configure a builder. */
export function AppsWelcome({ onCreate, onImport, importing }: AppsWelcomeProps) {
  return <div className="apps-welcome flex flex-col items-center">
    <header className="app-welcome-rise flex max-w-2xl flex-col items-center text-center">
      <span className="app-welcome-badge flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 py-1 pl-1.5 pr-3 text-[11px] font-medium text-muted-foreground">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary"><APPS_SECTION_ICON className="size-3" aria-hidden="true" /></span>Apps
      </span>
      <h1 className="app-welcome-title mt-4 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Describe it. <span className="app-welcome-accent">Nora builds it.</span></h1>
      <p className="mt-3 text-pretty text-sm leading-6 text-muted-foreground">Apps are dashboards and small tools built over the services you’ve connected: live tables, charts, numbers and buttons that act. Say what you need, then shape it together by chatting. No code needed.</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="secondary" size="lg" className="gap-2 bg-primary px-5 text-primary-foreground hover:bg-primary/90" onClick={() => onCreate()}>Create an app<ArrowRight className="size-4" aria-hidden="true" /></Button>
        <Button type="button" variant="outline" size="lg" onClick={() => { void noraSystemClient.openExternalUrl(APP_DIRECTORY_URL); }}>Browse shared apps</Button>
        <Button type="button" variant="ghost" size="lg" className="gap-2 px-4 text-muted-foreground" onClick={onImport} disabled={importing}><FileUp className="size-4" aria-hidden="true" />Import from file</Button>
      </div>
    </header>
    <AppWelcomeShowcase onCreate={onCreate} />
    <ol aria-label="How Apps work" className="app-welcome-steps mt-6 grid w-full gap-4">
      {STEPS.map(({ icon: Icon, title, text }, index) => <li key={title} className="relative border-t border-border/60 pt-3">
        <span className="absolute -top-px left-0 h-px w-10 bg-primary/70" aria-hidden="true" />
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">0{index + 1}</span>
          <Icon className="size-3.5 text-primary" aria-hidden="true" />{title}
        </div>
        <p className="app-welcome-step-text mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
      </li>)}
    </ol>
  </div>;
}
