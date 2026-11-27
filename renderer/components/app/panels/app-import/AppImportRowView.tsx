import { appImportSourceDisplayName } from "@shared/app-import/sources";
import { AppImportSourceIcon } from "@/components/app/shared/AppImportSourceIcon";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import type { AppImportRowViewProps } from "@/components/app/types/appImport.types";
import { Badge } from "@/components/ui/badge";

export function AppImportRowView({ row, checked, disabled, onToggle }: AppImportRowViewProps) {
  const selectable = row.keys.length > 0;
  return (
    <label className="flex items-start gap-3 rounded-md px-3 py-2 hover:bg-muted/40">
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" checked={checked} disabled={disabled || !selectable} onChange={() => onToggle(row)} />
      {row.avatar ? <BotAvatar avatar={row.avatar} size={24} className="shrink-0" /> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{row.label}</span>
        {row.detail ? <span className="block break-all text-xs text-muted-foreground">{row.detail}</span> : null}
        {row.unsupportedReason ? <span className="block text-xs text-muted-foreground">{row.unsupportedReason}</span> : null}
      </span>
      <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        <span className="flex items-center gap-1" title={`From ${row.sources.map(appImportSourceDisplayName).join(", ")}`}>
          {row.sources.map((source) => <AppImportSourceIcon key={source} source={source} className="size-4" />)}
        </span>
        {row.badge ? <Badge variant={row.badge.variant}>{row.badge.label}</Badge> : null}
      </span>
    </label>
  );
}
