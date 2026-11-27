import { AppImportSourceIcon } from "@/components/app/shared/AppImportSourceIcon";
import type { AppImportLeftBehindViewProps } from "@/components/app/types/appImport.types";

export function AppImportLeftBehindView({ items }: AppImportLeftBehindViewProps) {
  if (!items.length) return null;
  return (
    <details className="rounded-lg border border-border/70 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium">Left behind ({items.length})</summary>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <li key={`${item.source}:${item.label}:${index}`} className="flex items-start gap-2 text-xs">
            <AppImportSourceIcon source={item.source} className="mt-px size-3.5" />
            <span className="min-w-0"><span className="font-medium">{item.label}</span> <span className="text-muted-foreground">— {item.reason}</span></span>
          </li>
        ))}
      </ul>
    </details>
  );
}
