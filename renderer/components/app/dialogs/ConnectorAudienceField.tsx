import { useId } from "react";
import type { ConnectorAudienceFieldProps } from "@/components/app/types/noraConnectors.types";
import { ConnectorAccessChoiceIcon } from "@/components/app/shared/ConnectorAccessChoiceIcon";

/** One access dimension: everyone, or only the checked workspaces or bots. Picks are kept while "everyone" is selected. */
export function ConnectorAudienceField({ legend, allLabel, onlyLabel, emptyText, choices, value, onChange }: ConnectorAudienceFieldProps) {
  const name = useId();
  const toggle = (id: string, checked: boolean) => onChange({ kind: "only", ids: checked ? [...value.ids, id] : value.ids.filter((entry) => entry !== id) });
  return <fieldset className="space-y-2">
    <legend className="mb-2 text-sm font-medium text-foreground">{legend}</legend>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <label className="flex cursor-pointer items-center gap-2"><input type="radio" name={name} checked={value.kind === "all"} onChange={() => onChange({ ...value, kind: "all" })} />{allLabel}</label>
      <label className="flex cursor-pointer items-center gap-2"><input type="radio" name={name} checked={value.kind === "only"} onChange={() => onChange({ ...value, kind: "only" })} />{onlyLabel}</label>
    </div>
    {value.kind === "only" ? choices.length
      ? <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border border-border/60 p-1" aria-label={onlyLabel}>
        {choices.map((choice) => <li key={choice.id}>
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent/50">
            <input type="checkbox" checked={value.ids.includes(choice.id)} onChange={(event) => toggle(choice.id, event.target.checked)} />
            <ConnectorAccessChoiceIcon choice={choice} />
            <span className="min-w-0 flex-1 truncate">{choice.name}</span>
            {choice.kind === "bot" ? <span className="shrink-0 truncate text-xs text-muted-foreground">{choice.detail}</span> : null}
          </label>
        </li>)}
      </ul>
      : <p className="text-xs text-muted-foreground">{emptyText}</p> : null}
  </fieldset>;
}
