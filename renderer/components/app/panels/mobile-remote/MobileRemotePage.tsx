import { useState } from "react";
import { Smartphone } from "lucide-react";
import { MOBILE_REMOTE_DEMO_SCENES } from "@/components/app/constants/mobileRemoteDemo";
import { useRemoteAccess } from "@/components/app/hooks/useRemoteAccess";
import { useWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import type { MobileRemoteDemoScene } from "@/components/app/types/remoteAccess.types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileRemoteDemo } from "./MobileRemoteDemo";
import { MobileRemoteSetup } from "./MobileRemoteSetup";
import { NoraRelayDialog } from "./NoraRelayDialog";

/**
 * Pitches the phone app with a phone that plays through it, beside the steps to switch remote access on.
 * Each feature in the list is a tab for one scene; the active tab's progress bar is the clock, so hovering holds a scene,
 * choosing one stops the tour, and reduced motion (no animation) never advances.
 */
export function MobileRemotePage() {
  const controls = useRemoteAccess();
  const { onOpenRemoteAccessSettings } = useWorkspaceSidebarPorts();
  const [scene, setScene] = useState<MobileRemoteDemoScene["id"]>(MOBILE_REMOTE_DEMO_SCENES[0].id);
  const [touring, setTouring] = useState(true);
  const advance = (): void => {
    const index = MOBILE_REMOTE_DEMO_SCENES.findIndex((entry) => entry.id === scene);
    setScene(MOBILE_REMOTE_DEMO_SCENES[(index + 1) % MOBILE_REMOTE_DEMO_SCENES.length].id);
  };
  const pick = (id: string): void => {
    const chosen = MOBILE_REMOTE_DEMO_SCENES.find((entry) => entry.id === id);
    if (!chosen) return;
    setTouring(false); setScene(chosen.id);
  };
  return <section aria-labelledby="mobile-remote-title" className="mobile-remote-page h-full overflow-y-auto bg-background">
    <Tabs value={scene} onValueChange={pick} orientation="vertical" className="mobile-remote-layout mx-auto min-h-full max-w-5xl px-8 py-6">
      <div className="mobile-remote-in max-w-md space-y-4">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-2.5 py-1 text-xs text-muted-foreground">
            <Smartphone className="size-3.5 text-primary" aria-hidden="true" />Nora for iPhone · Beta</p>
          <h1 id="mobile-remote-title" className="text-2xl font-semibold tracking-tight">Your agents, <span className="mobile-remote-accent">in your pocket</span></h1>
          <p className="text-sm leading-relaxed text-muted-foreground">Keep work moving when you step away. Nora Relay links the Nora app on your phone to this computer, so you can follow threads, answer approvals and send instructions from anywhere. <NoraRelayDialog /></p>
        </div>
        <TabsList aria-label="What you can do from your phone" className="mobile-remote-features flex h-auto w-full flex-col items-stretch gap-0.5 border-0 bg-transparent p-0">
          {MOBILE_REMOTE_DEMO_SCENES.map((entry) => <TabsTrigger key={entry.id} value={entry.id}
            className="group relative flex-col items-start gap-0.5 overflow-hidden rounded-md px-3 py-1.5 text-left data-[state=active]:bg-secondary">
            <span className="text-sm text-foreground">{entry.title}</span>
            <span className="hidden text-xs font-normal text-muted-foreground group-data-[state=active]:block">{entry.description}</span>
            {touring && entry.id === scene && <span key={scene} className="mobile-remote-progress" aria-hidden="true" onAnimationEnd={advance} />}
          </TabsTrigger>)}
        </TabsList>
        <MobileRemoteSetup controls={controls} onOpenSettings={onOpenRemoteAccessSettings} />
      </div>
      <div className="mobile-remote-stage">
        {MOBILE_REMOTE_DEMO_SCENES.map((entry) => <TabsContent key={entry.id} value={entry.id} aria-label={`${entry.title}, shown with sample data`}>
          <MobileRemoteDemo scene={entry.id} />
        </TabsContent>)}
      </div>
    </Tabs>
  </section>;
}
