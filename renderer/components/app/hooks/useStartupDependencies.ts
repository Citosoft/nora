import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import {
  readStoredOnboardingCompleted,
  readStoredStartupDependenciesDismissed,
  writeStoredOnboardingCompleted,
  writeStoredStartupDependenciesDismissed
} from "@/components/app/logic/appPersistence";
import { buildStartupDependencyCopyText } from "@/components/app/logic/startupDependencyCopyText";
import type {
  UseStartupDependenciesArgs,
  UseStartupDependenciesResult
} from "@/components/app/types/appHooks.types";
import type { StartupDependency, StartupDependencyId, StartupDependencyReport } from "@shared/types/startupDependency.types";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useStartupDependencies({
  setUiState
}: UseStartupDependenciesArgs): UseStartupDependenciesResult {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(() => readStoredOnboardingCompleted());
  const [startupDependencyReport, setStartupDependencyReport] = useState<StartupDependencyReport | null>(null);
  const [isLoadingStartupDependencies, setIsLoadingStartupDependencies] = useState(true);
  const [startupDependenciesDismissed, setStartupDependenciesDismissed] = useState(() => readStoredStartupDependenciesDismissed());
  const [showStartupDependenciesDialog, setShowStartupDependenciesDialog] = useState(false);
  const [startupDependencyInstallTargetId, setStartupDependencyInstallTargetId] = useState<StartupDependencyId | null>(null);
  const [startupDependencyInstallErrorMessage, setStartupDependencyInstallErrorMessage] = useState<string | null>(null);
  const [simulatedMissingDependencyIds, setSimulatedMissingDependencyIds] = useState<StartupDependencyId[]>([]);

  const reloadStartupDependencyReport = useCallback(async (): Promise<void> => {
    setIsLoadingStartupDependencies(true);
    setStartupDependencyInstallErrorMessage(null);
    try {
      const nextReport = await noraSystemClient.getStartupDependencyReport();
      setStartupDependencyReport(nextReport);
    } catch (error) {
      setStartupDependencyInstallErrorMessage(error instanceof Error ? error.message : "Unable to check startup dependencies.");
      setStartupDependencyReport(null);
    } finally {
      setIsLoadingStartupDependencies(false);
      setStartupDependencyInstallTargetId(null);
    }
  }, []);

  useEffect(() => {
    void reloadStartupDependencyReport();
  }, [reloadStartupDependencyReport]);

  const installStartupDependencyWithRefresh = useCallback(async (dependencyId: StartupDependencyId): Promise<void> => {
    setStartupDependencyInstallTargetId(dependencyId);
    setStartupDependencyInstallErrorMessage(null);
    try {
      const nextReport = await noraSystemClient.installStartupDependency(dependencyId);
      setStartupDependencyReport(nextReport);
    } catch (error) {
      setStartupDependencyInstallErrorMessage(error instanceof Error ? error.message : "Unable to install the selected dependency.");
    } finally {
      setStartupDependencyInstallTargetId(null);
    }
  }, []);

  const openStartupDependenciesDialog = useCallback((): void => {
    setShowStartupDependenciesDialog(true);
  }, []);

  const openOnboardingFlow = useCallback((): void => {
    writeStoredOnboardingCompleted(false);
    setIsOnboardingCompleted(false);
    setShowStartupDependenciesDialog(false);
  }, []);

  const toggleSimulatedMissingDependency = useCallback((dependencyId: StartupDependencyId): void => {
    setSimulatedMissingDependencyIds((current) =>
      current.includes(dependencyId)
        ? current.filter((item) => item !== dependencyId)
        : [...current, dependencyId]
    );
    setShowStartupDependenciesDialog(true);
  }, []);

  const clearSimulatedMissingDependencies = useCallback((): void => {
    setSimulatedMissingDependencyIds([]);
  }, []);

  const completeOnboarding = useCallback((): void => {
    writeStoredOnboardingCompleted(true);
    setIsOnboardingCompleted(true);
    setShowStartupDependenciesDialog(false);
    setStartupDependenciesDismissed(true);
    writeStoredStartupDependenciesDismissed(true);
  }, []);

  const copyStartupDependencyInstructions = useCallback(async (dependency: StartupDependency): Promise<void> => {
    const content = buildStartupDependencyCopyText(dependency);
    if (!content) {
      const message = `No install command is available for ${dependency.label}.`;
      setUiState((current) => ({
        ...current,
        activeErrorMessage: message
      }));
      throw new Error(message);
    }

    try {
      await noraSystemClient.copyText(content);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to copy the dependency instructions.";
      setUiState((current) => ({
        ...current,
        activeErrorMessage: message
      }));
      throw error;
    }
  }, [setUiState]);

  const effectiveStartupDependencyReport = useMemo<StartupDependencyReport | null>(() => {
    if (!startupDependencyReport) {
      return null;
    }

    return {
      ...startupDependencyReport,
      dependencies: startupDependencyReport.dependencies.map((dependency) =>
        simulatedMissingDependencyIds.includes(dependency.id)
          ? {
              ...dependency,
              status: "missing",
              detectedPath: null,
              summary: `${dependency.label} is being treated as missing for testing.`
            }
          : dependency
      )
    };
  }, [simulatedMissingDependencyIds, startupDependencyReport]);

  const missingStartupDependencies = effectiveStartupDependencyReport?.dependencies.filter((dependency) => dependency.status === "missing") ?? [];
  const missingOptionalStartupDependencies = missingStartupDependencies.filter((dependency) => dependency.severity === "optional");
  const missingOptionalStartupDependencyCount = missingOptionalStartupDependencies.length;
  const isStartupDependencyDialogBusy = isLoadingStartupDependencies || startupDependencyInstallTargetId !== null;
  const isOnboardingOpen = !isOnboardingCompleted;
  const shouldShowStartupDependenciesDialog =
    (!isOnboardingOpen && showStartupDependenciesDialog) ||
    ((!isLoadingStartupDependencies && missingStartupDependencies.length > 0) &&
      (!isOnboardingOpen && !startupDependenciesDismissed));

  const handleStartupDependenciesDialogOpenChange = useCallback((open: boolean): void => {
    if (open) {
      setShowStartupDependenciesDialog(true);
      return;
    }

    setShowStartupDependenciesDialog(false);
    setStartupDependenciesDismissed(true);
    writeStoredStartupDependenciesDismissed(true);
  }, []);

  return {
    isOnboardingCompleted,
    isOnboardingOpen,
    effectiveStartupDependencyReport,
    startupDependencyInstallTargetId,
    startupDependencyInstallErrorMessage,
    simulatedMissingDependencyIds,
    missingOptionalStartupDependencyCount,
    isStartupDependencyDialogBusy,
    shouldShowStartupDependenciesDialog,
    reloadStartupDependencyReport,
    installStartupDependencyWithRefresh,
    openOnboardingFlow,
    openStartupDependenciesDialog,
    handleStartupDependenciesDialogOpenChange,
    toggleSimulatedMissingDependency,
    clearSimulatedMissingDependencies,
    completeOnboarding,
    copyStartupDependencyInstructions
  };
}
