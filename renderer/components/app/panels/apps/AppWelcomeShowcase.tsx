import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { APP_STARTERS } from "@/components/app/constants/appStarters";
import type { AppWelcomeShowcaseProps } from "@/components/app/types/appStarters.types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppIcon } from "./AppIcon";
import { AppWelcomePreview } from "./AppWelcomePreview";

/**
 * The example apps, played one after another until the user picks one.
 * The active tab's progress bar is the clock: its CSS animation ending advances to the next example, so hovering
 * (which pauses the animation) holds the current one, and reduced motion (no animation) never cycles.
 */
export function AppWelcomeShowcase({ onCreate }: AppWelcomeShowcaseProps) {
  const [active, setActive] = useState(APP_STARTERS[0].id);
  const [cycling, setCycling] = useState(true);
  const example = APP_STARTERS.find((starter) => starter.id === active) ?? APP_STARTERS[0];
  const advance = (): void => {
    const index = APP_STARTERS.findIndex((starter) => starter.id === active);
    setActive(APP_STARTERS[(index + 1) % APP_STARTERS.length].id);
  };
  const pick = (id: string): void => {
    setCycling(false);
    setActive(id);
  };
  return <Tabs value={active} onValueChange={pick} className="app-welcome-showcase app-welcome-rise mt-7 flex w-full flex-col items-center" style={{ animationDelay: "120ms" }}>
    <TabsList aria-label="Example apps" className="h-auto gap-0.5 rounded-full border-border/70 bg-card/70 p-1 backdrop-blur">
      {APP_STARTERS.map((starter) => <TabsTrigger key={starter.id} value={starter.id}
        className="group relative overflow-hidden rounded-full px-3.5 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
        <AppIcon icon={starter.icon} className="size-3.5 group-data-[state=active]:text-primary" />{starter.label}
        {cycling && starter.id === active && <span key={active} className="app-welcome-progress" aria-hidden="true" onAnimationEnd={advance} />}
      </TabsTrigger>)}
    </TabsList>
    <div className="app-welcome-stage relative mt-4 w-full">
      {APP_STARTERS.map((starter) => <TabsContent key={starter.id} value={starter.id} aria-label={`${starter.label} example`}><AppWelcomePreview example={starter} /></TabsContent>)}
    </div>
    <div className="mt-2 flex w-full flex-wrap items-center justify-between gap-2 px-1">
      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{example.label}.</span> {example.description} <span className="opacity-70">Shown with sample data.</span></p>
      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => onCreate(example.text)}>Start from this example<ArrowUpRight className="size-3" aria-hidden="true" /></Button>
    </div>
  </Tabs>;
}
