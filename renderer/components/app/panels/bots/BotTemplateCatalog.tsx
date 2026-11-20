import { useNoraConnectors } from "@/components/app/hooks/useNoraConnectors";
import { useState } from "react";
import { filterTemplates, selectedTemplate } from "@/components/app/logic/bot-templates/catalog";
import { Button } from "@/components/ui/button";
import { BotTemplateFilters } from "./BotTemplateFilters";
import { BotTemplateRow } from "./BotTemplateRow";
import { BotTemplateDetail } from "./BotTemplateDetail";
import type { BotTemplateCatalogProps, TemplateFilters } from "@/components/app/types/botTemplates.types";

export function BotTemplateCatalog({ templates, templateRole, onUse }: BotTemplateCatalogProps) {
  const connectors = useNoraConnectors();
  const [filters, setFilters] = useState<TemplateFilters>({ query: "", role: "all", suggestedOnly: false });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveFilters = templateRole ? filters : { ...filters, suggestedOnly: false };
  const results = filterTemplates(templates, effectiveFilters);
  const selected = selectedTemplate(results, selectedId);
  const suggestedIds = new Set(templates.suggested.map((template) => template.id));
  const total = templates.suggested.length + templates.more.length;
  const reset = (): void => setFilters({ query: "", role: "all", suggestedOnly: false });
  return <section aria-labelledby="bot-template-catalog-title" className="flex min-h-0 flex-1 flex-col gap-4">
    <header className="shrink-0 pr-10">
      <h2 id="bot-template-catalog-title" className="text-xl font-semibold tracking-tight">Bot templates</h2>
      <p className="mt-1 text-sm text-muted-foreground">Find a teammate for the job. Browse their responsibilities before creating a bot.</p>
    </header>
    <BotTemplateFilters filters={effectiveFilters} templateRole={templateRole} onChange={setFilters} />
    <div className="flex shrink-0 items-center justify-between gap-3 text-xs text-muted-foreground">
      <p role="status">{results.length} of {total} templates</p>
      {(filters.query || filters.role !== "all" || effectiveFilters.suggestedOnly) && <Button type="button" variant="ghost" size="sm" onClick={reset}>Clear filters</Button>}
    </div>
    {selected ? <div className="grid min-h-0 flex-1 grid-rows-[minmax(8rem,2fr)_minmax(0,3fr)] overflow-hidden rounded-lg border bg-card md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:grid-rows-[minmax(0,1fr)]">
      <nav aria-label="Bot template results" className="min-h-0 overflow-y-auto border-b p-2 md:border-b-0 md:border-r">
        <ul className="space-y-1">{results.map((template) => <BotTemplateRow key={template.id} template={template} selected={selected.id === template.id}
          suggested={suggestedIds.has(template.id)} onSelect={() => setSelectedId(template.id)} />)}</ul>
      </nav>
      <div className="min-h-0 overflow-y-auto"><BotTemplateDetail key={selected.id} template={selected} connectors={connectors.connectors} onUse={onUse} /></div>
    </div> : <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-dashed px-6 py-12 text-center">
      <h3 className="text-sm font-medium">No templates match your filters</h3>
      <p className="mt-1 text-sm text-muted-foreground">Try a broader search or choose another role.</p>
      <Button type="button" variant="outline" className="mt-4" onClick={reset}>Clear filters</Button>
    </div>}
  </section>;
}
