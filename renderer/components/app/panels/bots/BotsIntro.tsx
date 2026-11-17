import { Brain, Plus, Users, UserRoundCog } from "lucide-react";
import { AppMark } from "@/components/app/shared/AppMark";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Button } from "@/components/ui/button";
import type { BotsIntroProps } from "@/components/app/types/botNavigation.types";

const POINTS = [
  { icon: UserRoundCog, title: "A role and its own model", text: "Give each bot a job, standing instructions and the model that suits it. Every thread with it starts from there." },
  { icon: Brain, title: "Memory that's yours to see", text: "Bots keep short notes between threads. You can read, edit and delete every one in the bot's settings." },
  { icon: Users, title: "Bots that work together", text: "Bots can ask each other for help, and group chats let several reply in turn, each from its own thread." }
] as const;

/** Empty state: what bots are, before the templates below it. */
export function BotsIntro({ onNewBot, faces }: BotsIntroProps) {
  return <div className="flex flex-col gap-6 rounded-lg border bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8">
    <div className="flex items-center" aria-hidden="true">
      {faces.slice(0, 5).map((template, index) => <span key={template.id} className={index ? "-ml-3" : ""}>
        <BotAvatar avatar={{ seed: index, ...template.avatar }} state={index === 2 ? "speaking" : "idle"} size={48} /></span>)}
    </div>
    <div><h2 className="text-2xl font-semibold tracking-tight">Meet your bots</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Bots are teammates you set up once: a reviewer, a release manager, a researcher. Talk to one from any workspace, or keep one just for this project.</p></div>
    <ul className="grid gap-4 sm:grid-cols-3">{POINTS.map(({ icon: Icon, title, text }) => <li key={title} className="space-y-1.5">
      <Icon className="size-5 text-primary" aria-hidden="true" /><p className="text-sm font-medium">{title}</p><p className="text-sm text-muted-foreground">{text}</p></li>)}</ul>
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" className="gap-1.5" onClick={onNewBot}><Plus className="size-4" aria-hidden="true" />Create a bot</Button>
      <span className="flex items-center gap-2 text-sm text-muted-foreground"><AppMark className="size-4" />or ask Nora: “make me a code reviewer bot”</span>
    </div>
  </div>;
}
