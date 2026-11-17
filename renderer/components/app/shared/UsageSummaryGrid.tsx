import { Fragment } from "react";
import type { UsageSummaryGridProps } from "@/components/app/types/toolUsage.types";
import { UsageWindowRow } from "./UsageWindowRow";

/** Usage windows, signed-in account and provider facts as one label/value grid. */
export function UsageSummaryGrid({ info }: UsageSummaryGridProps) {
  return <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
    {info.windows.map((window) => <UsageWindowRow key={window.id} window={window} />)}
    {info.account ? <>
      <div className="text-[11px] text-muted-foreground">User</div>
      <div className="min-w-0 truncate text-foreground" title={info.account}>{info.account}</div>
    </> : null}
    {info.details?.map((detail) => <Fragment key={detail.label}>
      <div className="text-[11px] text-muted-foreground">{detail.label}</div>
      <div className="min-w-0 truncate text-foreground" title={detail.value}>{detail.value}</div>
    </Fragment>)}
  </div>;
}
