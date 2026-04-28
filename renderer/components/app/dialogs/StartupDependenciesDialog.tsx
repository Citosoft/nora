import { isProductionBuild } from "@/components/app/logic/appEnvironment";
import type { StartupDependenciesDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Copy, LoaderCircle, RefreshCcw, XCircle } from "lucide-react";

export function StartupDependenciesDialog({
  open,
  dependencies,
  isLoading,
  installTargetId,
  installErrorMessage,
  simulatedMissingDependencyIds,
  onOpenChange,
  onInstallDependency,
  onCopyInstructions,
  onToggleSimulatedMissing,
  onClearSimulation,
  onReload,
  onQuit
}: StartupDependenciesDialogProps) {
  const missingDependencies = dependencies.filter((dependency) => dependency.status === "missing");
  const blockingDependencies = missingDependencies.filter((dependency) => dependency.severity === "mandatory");
  const hasBlockingDependencies = blockingDependencies.length > 0;
  const showSimulationControls = !isProductionBuild;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(72vh,700px)] w-[min(1100px,calc(100vw-2rem))] max-w-none"
        headerTitle="Startup dependencies"
      >
        <DialogHeader>
          <DialogTitle>{hasBlockingDependencies ? "Nora cannot finish booting yet" : "Some optional dependencies are missing"}</DialogTitle>
          <DialogDescription>
            {hasBlockingDependencies
              ? "Install the missing mandatory dependencies or follow the manual instructions below, then reload the checks."
              : "The app can continue, but the features listed below will stay unavailable until their dependencies are installed."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {showSimulationControls && simulatedMissingDependencyIds.length ? (
            <div className="rounded-[4px] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
              Simulation mode is active. Missing states below are mocked for UI testing only.
            </div>
          ) : null}

          <div className="flex min-h-0 flex-col rounded-[4px] border border-border/70 bg-background/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">Checklist</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Open this dialog anytime to inspect startup requirements and simulate missing tools.
                </div>
              </div>
              {showSimulationControls && simulatedMissingDependencyIds.length ? (
                <Button variant="outline" onClick={onClearSimulation} disabled={isLoading}>
                  Clear simulation
                </Button>
              ) : null}
            </div>
            <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {dependencies.map((dependency) => {
                const isInstalling = installTargetId === dependency.id;
                const isSimulatedMissing = simulatedMissingDependencyIds.includes(dependency.id);
                const isAvailable = dependency.status === "available";
                return (
                  <div
                    key={dependency.id}
                    className="rounded-[6px] border border-border/70 bg-card/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isAvailable ? (
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                          ) : dependency.severity === "mandatory" ? (
                            <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                          ) : (
                            <XCircle className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="font-medium text-foreground">{dependency.label}</div>
                          <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {dependency.severity}
                          </span>
                          <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {dependency.status}
                          </span>
                          {isSimulatedMissing ? (
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                              simulated
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">{dependency.summary}</div>
                        {dependency.detectedPath ? (
                          <div className="mt-3 rounded-[4px] border border-border/60 bg-background px-3 py-2 text-xs text-foreground">
                            {dependency.detectedPath}
                          </div>
                        ) : null}
                        {dependency.installHint ? (
                          <div className="mt-3 rounded-[4px] border border-border/60 bg-background px-3 py-2 text-sm text-foreground">
                            {dependency.installHint}
                          </div>
                        ) : null}
                        {dependency.manualInstructions.length ? (
                          <div className="mt-3 space-y-2">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Manual instructions
                            </div>
                            <div className="space-y-2">
                              {dependency.manualInstructions.map((instruction) => (
                                <div
                                  key={instruction}
                                  className="rounded-[4px] border border-border/60 bg-background px-3 py-2 text-sm text-foreground"
                                >
                                  {instruction}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        {showSimulationControls ? (
                          <Button
                            variant="outline"
                            onClick={() => onToggleSimulatedMissing(dependency.id)}
                            disabled={isLoading}
                          >
                            {isSimulatedMissing ? "Clear mock" : "Mock missing"}
                          </Button>
                        ) : null}
                        {dependency.canAutoInstall ? (
                          <Button
                            onClick={() => onInstallDependency(dependency.id)}
                            disabled={isLoading || isSimulatedMissing || isAvailable}
                          >
                            {isInstalling ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                            {dependency.autoInstallLabel || "Install"}
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          onClick={() => onCopyInstructions(dependency)}
                          disabled={isLoading}
                        >
                          <Copy className="size-4" />
                          Copy steps
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 rounded-[4px] border border-border/70 bg-background/60 px-4 py-3 text-sm text-foreground">
              <LoaderCircle className="size-4 animate-spin text-primary" />
              Checking startup dependencies...
            </div>
          ) : missingDependencies.length === 0 ? (
            <div className="rounded-[4px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-foreground">
              All checked dependencies are available.
            </div>
          ) : (
            <div className="rounded-[4px] border border-border/70 bg-background/60 px-4 py-3 text-sm text-foreground">
              {hasBlockingDependencies
                ? "One or more mandatory dependencies are missing."
                : "Optional dependencies are missing. The app can continue without them."}
            </div>
          )}

          {installErrorMessage ? (
            <div className="rounded-[4px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
              {installErrorMessage}
            </div>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onReload} disabled={isLoading}>
            <RefreshCcw className="size-4" />
            Reload checks
          </Button>
          {hasBlockingDependencies ? (
            <Button onClick={onQuit} disabled={isLoading}>
              Quit Nora
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)} disabled={isLoading}>
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
