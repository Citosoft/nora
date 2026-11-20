import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { AUTO_UPDATE_TEST_ACTIONS } from "@/components/app/logic/aboutDialogStatus";
import { Button } from "@/components/ui/button";
import type { AutoUpdateTestTarget } from "@shared/appTypes";
import { ChevronDown, FlaskConical } from "lucide-react";
import { useId, useState } from "react";

/** Developer-only controls for simulating updater states; mounted only when local testing is supported. */
export function UpdateTestingPanel() {
  const [expanded, setExpanded] = useState(false);
  const [runningTarget, setRunningTarget] = useState<AutoUpdateTestTarget | null>(null);
  const contentId = useId();

  const simulate = (target: AutoUpdateTestTarget): void => {
    setRunningTarget(target);
    void noraSystemClient.simulateAutoUpdateStatus(target)
      .catch(() => undefined)
      .finally(() => {
        setRunningTarget((current) => (current === target ? null : current));
      });
  };

  return (
    <section className="rounded-lg border border-dashed border-border/70">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <FlaskConical className="size-3.5" aria-hidden="true" />
        <span className="flex-1">Local update testing</span>
        <ChevronDown className={expanded ? "size-3.5 rotate-180 transition-transform" : "size-3.5 transition-transform"} aria-hidden="true" />
      </button>
      {expanded ? (
        <div id={contentId} className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-3">
          {AUTO_UPDATE_TEST_ACTIONS.map((action) => (
            <Button
              key={action.target}
              variant="outline"
              size="sm"
              disabled={runningTarget !== null}
              onClick={() => simulate(action.target)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
