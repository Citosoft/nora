import { useEffect, useId, useState } from "react";
import type { ComponentFn } from "@json-render/react";
import { useBoundProp } from "@json-render/react";
import type { AppCatalog } from "@shared/apps/catalog";
import { DATE_RANGE_PRESETS, dateRangeFor, isDateRangePreset } from "@/components/app/logic/apps/dateRange";
import { propText } from "@/components/app/logic/apps/propText";
import type { AppDateRangePreset } from "@/components/app/types/appsComponents.types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/** A preset or two dates, written to the bound `from` and `to` paths as YYYY-MM-DD so a source can read them as arguments. */
export const AppDateRange: ComponentFn<AppCatalog, "DateRange"> = ({ props, bindings }) => {
  const id = useId();
  const [from, setFrom] = useBoundProp<string>(undefined, bindings?.from);
  const [to, setTo] = useBoundProp<string>(undefined, bindings?.to);
  const initial = isDateRangePreset(props.preset) ? props.preset : "last30";
  const [preset, setPreset] = useState<AppDateRangePreset>(initial);
  const apply = (next: AppDateRangePreset): void => {
    setPreset(next);
    const range = dateRangeFor(next);
    if (range) { setFrom(range.from); setTo(range.to); }
  };
  // The preset fills the dates once, unless the state already carries dates (a default or a saved choice).
  useEffect(() => { if (!from && !to) apply(initial); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="flex flex-col gap-1">
    <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{propText(props.label)}</label>
    <div className="flex flex-wrap items-center gap-2">
      <Select id={id} aria-label={propText(props.label) || "Date range"} className="h-9 w-44 text-sm" value={preset} onChange={(event) => { if (isDateRangePreset(event.target.value)) apply(event.target.value); }}>
        {DATE_RANGE_PRESETS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </Select>
      {preset === "custom" && <>
        <Input type="date" aria-label="From" value={from ?? ""} onChange={(event) => setFrom(event.target.value)} className="h-9 w-40 text-sm" />
        <span className="text-xs text-muted-foreground">to</span>
        <Input type="date" aria-label="To" value={to ?? ""} onChange={(event) => setTo(event.target.value)} className="h-9 w-40 text-sm" />
      </>}
      {preset !== "custom" && from && to && <span className="text-xs text-muted-foreground">{from} to {to}</span>}
    </div>
  </div>;
};
