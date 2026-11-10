import { useState } from "react";
import { Activity, ArrowLeft, ChevronRight, HardDrive, MessagesSquare, MonitorPlay, Sparkles, Wrench } from "lucide-react";
import type { WorkspaceToolContentProps, WorkspaceToolItem, WorkspaceToolsProps, WorkspaceToolSection } from "@/components/app/types/workspaceUtilities.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChatbotPanel } from "./ChatbotPanel";
import { PortsPanel } from "./PortsPanel";
import { RemoteMountsPanel } from "./RemoteMountsPanel";
import { SkillsPanel } from "./SkillsPanel";
import { WorkspaceStatusPanel } from "./WorkspaceStatusPanel";

const sections: readonly WorkspaceToolItem[] = [
  { id: "status", label: "Workspace status", icon: Activity },
  { id: "skills", label: "Skills", icon: Sparkles },
  { id: "ports", label: "Ports", icon: MonitorPlay },
  { id: "mounts", label: "Remote mounts", icon: HardDrive },
  { id: "chatbots", label: "AI chatbots", icon: MessagesSquare }
];

function WorkspaceToolContent({ section, status, onClose }: WorkspaceToolContentProps) {
  switch (section) {
    case "status": return <WorkspaceStatusPanel {...status} />;
    case "skills": return <SkillsPanel tools={status.tools} agentSkillCatalogs={status.agentSkillCatalogs} onOpenSkillsSettings={status.onOpenSkillsSettings} onClose={onClose} />;
    case "ports": return <PortsPanel onClose={onClose} />;
    case "mounts": return <RemoteMountsPanel onClose={onClose} />;
    case "chatbots": return <ChatbotPanel onClose={onClose} />;
  }
}

export function WorkspaceTools({ collapsed, status }: WorkspaceToolsProps) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<WorkspaceToolSection | null>(null);
  const title = sections.find((item) => item.id === section)?.label ?? "Workspace tools";
  return <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSection(null); }}>
    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Open workspace tools" tooltip="Workspace tools"><Wrench className="size-4" aria-hidden="true" /></Button></PopoverTrigger>
    <PopoverContent side={collapsed ? "right" : "top"} align="start" className="w-80 max-h-[70vh] overflow-y-auto p-2" aria-label="Workspace tools">
      {section ? <>
        <div className="mb-3 flex items-center gap-2 border-b pb-2"><Button autoFocus variant="ghost" size="icon" className="size-7" aria-label="Back to workspace tools" onClick={() => setSection(null)}><ArrowLeft className="size-4" aria-hidden="true" /></Button><span className="text-xs font-medium">{title}</span></div>
        <div className="p-1"><WorkspaceToolContent section={section} status={status} onClose={() => { setOpen(false); setSection(null); }} /></div>
      </> : <>
        <p className="px-2 py-2 text-xs font-medium">Workspace tools</p>
        {sections.map(({ id, label, icon: Icon }, index) => <Button key={id} autoFocus={index === 0} variant="ghost" className="h-10 w-full justify-start text-xs" onClick={() => setSection(id)}><Icon className="size-4 text-muted-foreground" aria-hidden="true" />{label}<ChevronRight className="ml-auto size-3.5 text-muted-foreground" aria-hidden="true" /></Button>)}
      </>}
    </PopoverContent>
  </Popover>;
}
