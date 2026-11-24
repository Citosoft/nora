import type { RuntimeDirectoryApi } from "@/types/runtimeDirectory.types";
import { relativeTime } from "@/state/relativeTime";
import { Banner } from "@/components/common/Banner";
import { Button } from "@/components/common/Button";
import { Inset } from "@/components/common/Inset";
import { StateView } from "@/components/common/StateView";

/** The computer list's loading, error and "saved copy" states, shared by the dashboard and the computer list. */
export function DirectoryNotices({ directory, now }: { directory: RuntimeDirectoryApi; now: Date }) {
  const state = directory.state;
  const retry = (): void => void directory.refresh();
  if (state.status === "loading") return <StateView kind="loading" message="Finding your computers…" />;
  if (state.status === "error") return <StateView kind="error" title="Couldn't load your computers" message={state.message} onRetry={retry} />;
  const view = state.value;
  if (view.source !== "cached") return null;
  return (
    <Inset>
      <Banner tone="attention" title="Showing your saved list"
        message={`${view.liveError ?? "Nora's account service is unreachable."}${view.savedAt ? ` Saved ${relativeTime(view.savedAt, now)}.` : ""}`}
        action={<Button label="Try again" compact onPress={retry} />} />
    </Inset>
  );
}
