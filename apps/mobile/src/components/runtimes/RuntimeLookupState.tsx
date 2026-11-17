import type { RuntimeSessionLookup } from "@/types/runtimeSession.types";
import { StateView } from "@/components/common/StateView";

/** What a runtime screen shows before its computer resolves: a spinner, or why the computer isn't available. */
export function RuntimeLookupState({ lookup }: { lookup: Exclude<RuntimeSessionLookup, { status: "ready" }> }) {
  return lookup.status === "loading" ? <StateView kind="loading" message="Finding your computer…" />
    : <StateView kind="empty" icon="desktop-outline" title="This computer isn't available" message={lookup.message} />;
}
