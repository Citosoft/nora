import { Search } from "lucide-react";
import { presetRoleSchema } from "@shared/personalization/contracts";
import { TEMPLATE_ROLES } from "@/components/app/logic/bot-templates/catalog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { TemplateFiltersProps } from "@/components/app/types/botTemplates.types";

export function BotTemplateFilters({ filters, templateRole, onChange }: TemplateFiltersProps) {
  return <div className="flex shrink-0 flex-wrap items-center gap-2">
    <div className="relative min-w-48 flex-1">
      <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
      <Input type="search" aria-label="Search bot templates" placeholder="Search roles, responsibilities or skills…" className="pl-9"
        value={filters.query} onChange={(event) => onChange({ ...filters, query: event.target.value })} />
    </div>
    <Select aria-label="Filter templates by role" className="w-full sm:w-64" value={filters.role} onChange={(event) => {
      const role = presetRoleSchema.safeParse(event.target.value);
      onChange({ ...filters, role: role.success ? role.data : "all" });
    }}>
      <option value="all">All roles</option>
      {TEMPLATE_ROLES.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
    </Select>
    {templateRole && <Button type="button" variant={filters.suggestedOnly ? "secondary" : "outline"} aria-pressed={filters.suggestedOnly}
      title={`Suggested for ${templateRole}`} onClick={() => onChange({ ...filters, suggestedOnly: !filters.suggestedOnly })}>Suggested for you</Button>}
  </div>;
}
