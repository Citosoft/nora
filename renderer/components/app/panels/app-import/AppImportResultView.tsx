import { countAppImportOutcomes } from "@/components/app/logic/app-import/appImportChecklist";
import type { AppImportResultViewProps } from "@/components/app/types/appImport.types";
import { AppImportSourceIcon } from "@/components/app/shared/AppImportSourceIcon";
import type { AppImportItemOutcome } from "@shared/types/app-import/appImportApply.types";

function outcomeText(outcome: AppImportItemOutcome): string {
  switch (outcome.status) {
    case "applied": return "Imported";
    case "alreadyImported": return "Already imported";
    case "skipped": return `Skipped: ${outcome.reason}`;
    case "failed": return `Failed: ${outcome.message}`;
  }
}

export function AppImportResultView({ results, unavailable }: AppImportResultViewProps) {
  const counts = countAppImportOutcomes(results);
  const problems = results.filter((result) => result.outcome.status === "failed" || result.outcome.status === "skipped");
  return (
    <div className="space-y-3">
      <p role="status" className="text-sm">
        Imported {counts.applied} {counts.applied === 1 ? "item" : "items"}
        {counts.alreadyImported ? `, ${counts.alreadyImported} already in Nora` : ""}
        {counts.skipped ? `, ${counts.skipped} skipped` : ""}
        {counts.failed ? `, ${counts.failed} failed` : ""}.
      </p>
      {unavailable.length ? <p role="alert" className="text-xs text-destructive">{unavailable.join(", ")} couldn't be read when the import ran, so nothing was imported from {unavailable.length === 1 ? "it" : "them"}.</p> : null}
      {problems.length ? (
        <ul className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-border/70 p-3">
          {problems.map((result) => (
            <li key={result.importKey} className="flex items-start gap-2 text-xs">
              <AppImportSourceIcon source={result.source} className="mt-px size-3.5" />
              <span className="min-w-0">
              <span className="font-medium">{result.label}</span>{" "}
              <span className={result.outcome.status === "failed" ? "text-destructive" : "text-muted-foreground"}>— {outcomeText(result.outcome)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
