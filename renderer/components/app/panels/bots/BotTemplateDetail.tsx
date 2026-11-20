import { routinesForTemplate } from "@shared/bots/templateRoutines";
import { RoutinePresetDetails } from "./routines/RoutinePresetDetails";
import { templateConnectorMatches } from "@shared/bots/templateConnectors";
import { McpServerLogo } from "@/components/app/panels/settings/McpServerLogo";
import { Plus } from "lucide-react";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { templateRoleLabels } from "@/components/app/logic/bot-templates/catalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BotTemplateDetailProps } from "@/components/app/types/botTemplates.types";

export function BotTemplateDetail({ template, connectors, onUse }: BotTemplateDetailProps) {
  return <section id="bot-template-detail" aria-labelledby="bot-template-title" className="min-w-0 space-y-6 p-5 sm:p-6">
    <header className="flex items-start gap-3">
      <BotAvatar avatar={{ seed: 0, ...template.avatar }} size={52} />
      <div className="min-w-0">
        <h3 id="bot-template-title" className="text-lg font-semibold">{template.role}</h3>
        <p className="text-sm text-muted-foreground">{template.name} · Suggested bot name</p>
      </div>
    </header>
    <p className="text-sm leading-relaxed text-muted-foreground">{template.summary}</p>
    <div className="flex flex-wrap gap-1.5" aria-label="Suited to roles">
      {templateRoleLabels(template).map((label) => <Badge key={label} variant="secondary">{label}</Badge>)}
    </div>
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Responsibilities & instructions</h4>
      <p className="whitespace-pre-wrap text-sm leading-7">{template.instructions}</p>
    </div>
    {template.connectorGalleryIds.length > 0 && <div className="space-y-2">
      <h4 className="text-sm font-medium">Recommended connectors</h4>
      <ul className="space-y-2 text-sm">{templateConnectorMatches(template, connectors ?? []).map(({ entry, connectors: matches }) => <li key={entry.id} className="flex items-center gap-2">
        <McpServerLogo logo={entry.logo} /><span className="min-w-0 flex-1 truncate">{entry.name}</span>
        <span className="text-xs text-muted-foreground">{connectors === null ? "Checking…" : !matches.length ? "Not added" : matches.length > 1 ? "Choose account" : matches[0].enabled ? "Added" : "Disabled"}</span>
      </li>)}</ul>
      <p className="text-xs leading-relaxed text-muted-foreground">Available connectors are preselected. Choose between multiple accounts in the bot editor; add missing services in Settings → MCP Servers.</p>
    </div>}
    {template.routineTemplateIds.length > 0 && <div className="space-y-3">
      <h4 className="text-sm font-medium">Routine presets</h4>
      <ul className="space-y-3">{routinesForTemplate(template).map((routine) => <li key={routine.id}><RoutinePresetDetails template={routine} /></li>)}</ul>
      <p className="text-xs text-muted-foreground">Choose which to include during creation. They start paused, ready to edit and enable in the bot’s Routines section.</p>
    </div>}
    <footer className="space-y-2 border-t pt-4">
      <Button type="button" className="gap-1.5" onClick={() => onUse(template)}><Plus className="size-4" aria-hidden="true" />Create bot</Button>
      <p className="text-xs leading-relaxed text-muted-foreground">Choose a model and customise the name, avatar and instructions before saving.</p>
    </footer>
  </section>;
}
