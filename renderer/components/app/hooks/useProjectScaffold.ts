import { useEffect, useMemo, useState } from "react";
import { PROJECT_SCAFFOLD_FRAMEWORKS } from "@/components/app/constants/projectScaffoldRegistry";
import {
  SCAFFOLD_STEPS,
  SCAFFOLD_STEP_COPY,
} from "@/components/app/constants/projectScaffoldWizard";
import { resolveDefaultAgentTool } from "@/components/app/logic/agentQuickLaunch";
import { groupProjectScaffoldComponentOptions } from "@/components/app/logic/projectScaffoldOptionGroups";
import {
  deleteProjectScaffoldFavorite,
  readStoredProjectScaffoldFavorites,
  saveProjectScaffoldFavorite,
} from "@/components/app/logic/projectScaffoldFavorites";
import {
  buildProjectScaffoldPrompt,
  resolveProjectScaffoldOptions,
} from "@/components/app/logic/projectScaffoldPrompt";
import { resolveManagedAgentLaunchOptions } from "@shared/agentStartupCapabilities";
import { isAgentToolAvailable } from "@shared/agentToolState";
import type { AddWorkspaceDialogProps } from "@/components/app/types/chromeDialog.types";
import type {
  ProjectScaffoldFramework,
  ProjectScaffoldFrameworkCategory,
  ProjectScaffoldWizardStep,
} from "@/components/app/types/projectScaffoldWizard.types";

function recommendedOptionIds(
  framework: ProjectScaffoldFramework,
  optionKind: "componentOptions" | "testingOptions",
): string[] {
  return framework[optionKind]
    .filter((option) => option.recommended)
    .map((option) => option.id);
}

export function useProjectScaffold({
  open,
  tools,
  preferredAgentToolId,
  onCreateNewProjectAgent,
}: AddWorkspaceDialogProps) {
  const [step, setStep] = useState<ProjectScaffoldWizardStep>("framework");
  const [selectedFrameworkId, setSelectedFrameworkId] = useState(
    PROJECT_SCAFFOLD_FRAMEWORKS[0]?.id ?? "",
  );
  const [frameworkSearch, setFrameworkSearch] = useState("");
  const [selectedFrameworkCategory, setSelectedFrameworkCategory] = useState<
    ProjectScaffoldFrameworkCategory | "all"
  >("all");
  const [projectName, setProjectName] = useState("");
  const [shouldSaveFavorite, setShouldSaveFavorite] = useState(false);
  const [favoriteName, setFavoriteName] = useState("");
  const [favoriteStacks, setFavoriteStacks] = useState(
    readStoredProjectScaffoldFavorites,
  );
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedFramework =
    PROJECT_SCAFFOLD_FRAMEWORKS.find(
      (framework) => framework.id === selectedFrameworkId,
    ) ?? PROJECT_SCAFFOLD_FRAMEWORKS[0];
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>(
    () =>
      selectedFramework
        ? recommendedOptionIds(selectedFramework, "componentOptions")
        : [],
  );
  const [selectedTestingIds, setSelectedTestingIds] = useState<string[]>(() =>
    selectedFramework
      ? recommendedOptionIds(selectedFramework, "testingOptions")
      : [],
  );
  const availableTools = useMemo(
    () => tools.filter((tool) => isAgentToolAvailable(tool)),
    [tools],
  );
  const frameworkCategoryCounts = useMemo(() => {
    const counts: Record<ProjectScaffoldFrameworkCategory | "all", number> = {
      all: PROJECT_SCAFFOLD_FRAMEWORKS.length,
      web: 0,
      backend: 0,
      mobile: 0,
      desktop: 0,
      data: 0,
      cli: 0,
      game: 0,
      monorepo: 0,
    };
    for (const framework of PROJECT_SCAFFOLD_FRAMEWORKS) {
      counts[framework.category] += 1;
    }
    return counts;
  }, []);
  const filteredFrameworks = useMemo(() => {
    const query = frameworkSearch.trim().toLowerCase();
    return PROJECT_SCAFFOLD_FRAMEWORKS.filter((framework) => {
      if (
        selectedFrameworkCategory !== "all" &&
        framework.category !== selectedFrameworkCategory
      ) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [
        framework.label,
        framework.language,
        framework.description,
        framework.category,
        framework.starterCommand ?? "",
        ...framework.componentOptions.map((option) => option.label),
        ...framework.testingOptions.map((option) => option.label),
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [frameworkSearch, selectedFrameworkCategory]);
  const defaultToolId = useMemo(
    () =>
      resolveDefaultAgentTool(availableTools, preferredAgentToolId)?.id ?? "",
    [availableTools, preferredAgentToolId],
  );
  const [selectedToolId, setSelectedToolId] = useState(defaultToolId);
  const stepIndex = SCAFFOLD_STEPS.indexOf(step);
  const previousStep = stepIndex > 0 ? SCAFFOLD_STEPS[stepIndex - 1] : null;
  const nextStep =
    stepIndex < SCAFFOLD_STEPS.length - 1
      ? SCAFFOLD_STEPS[stepIndex + 1]
      : null;
  const progressSteps = SCAFFOLD_STEPS.map((item) => ({
    id: item,
    title: SCAFFOLD_STEP_COPY[item].title,
  }));
  const stepCopy = SCAFFOLD_STEP_COPY[step];
  const selectedComponents = selectedFramework
    ? resolveProjectScaffoldOptions(
        selectedFramework,
        selectedComponentIds,
        "componentOptions",
      )
    : [];
  const componentGroups = selectedFramework
    ? groupProjectScaffoldComponentOptions(selectedFramework.componentOptions)
    : [];
  const selectedTesting = selectedFramework
    ? resolveProjectScaffoldOptions(
        selectedFramework,
        selectedTestingIds,
        "testingOptions",
      )
    : [];
  const scaffoldPrompt = selectedFramework
    ? buildProjectScaffoldPrompt({
        framework: selectedFramework,
        components: selectedComponents,
        testing: selectedTesting,
      })
    : "";
  const normalizedProjectName = projectName.trim();
  const normalizedFavoriteName = favoriteName.trim();
  const canLaunchScaffoldAgent = Boolean(
    normalizedProjectName &&
    selectedFramework &&
    selectedToolId &&
    onCreateNewProjectAgent &&
    (!shouldSaveFavorite || normalizedFavoriteName) &&
    !isCreatingProject,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const initialFramework = PROJECT_SCAFFOLD_FRAMEWORKS[0];
    setStep("framework");
    setSelectedFrameworkId(initialFramework?.id ?? "");
    setFrameworkSearch("");
    setSelectedFrameworkCategory("all");
    setSelectedComponentIds(
      initialFramework
        ? recommendedOptionIds(initialFramework, "componentOptions")
        : [],
    );
    setSelectedTestingIds(
      initialFramework
        ? recommendedOptionIds(initialFramework, "testingOptions")
        : [],
    );
    setProjectName("");
    setShouldSaveFavorite(false);
    setFavoriteName("");
    setFavoriteStacks(readStoredProjectScaffoldFavorites());
    setIsCreatingProject(false);
  }, [open]);

  useEffect(() => {
    setSelectedToolId(defaultToolId);
  }, [defaultToolId]);

  const handleSelectFramework = (framework: ProjectScaffoldFramework): void => {
    setSelectedFrameworkId(framework.id);
    setSelectedComponentIds(
      recommendedOptionIds(framework, "componentOptions"),
    );
    setSelectedTestingIds(recommendedOptionIds(framework, "testingOptions"));
  };

  const toggleComponent = (optionId: string): void => {
    setSelectedComponentIds((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    );
  };

  const toggleTesting = (optionId: string): void => {
    setSelectedTestingIds((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    );
  };

  const applyFavoriteStack = (favoriteId: string): void => {
    const favorite = favoriteStacks.find((entry) => entry.id === favoriteId);
    const framework = PROJECT_SCAFFOLD_FRAMEWORKS.find(
      (entry) => entry.id === favorite?.frameworkId,
    );
    if (!favorite || !framework) {
      return;
    }

    const validComponentIds = new Set(
      framework.componentOptions.map((option) => option.id),
    );
    const validTestingIds = new Set(
      framework.testingOptions.map((option) => option.id),
    );
    setSelectedFrameworkId(framework.id);
    setSelectedComponentIds(
      favorite.componentIds.filter((id) => validComponentIds.has(id)),
    );
    setSelectedTestingIds(
      favorite.testingIds.filter((id) => validTestingIds.has(id)),
    );
    if (
      favorite.toolId &&
      availableTools.some((tool) => tool.id === favorite.toolId)
    ) {
      setSelectedToolId(favorite.toolId);
    }
    setShouldSaveFavorite(false);
    setFavoriteName("");
    setStep("agent");
  };

  const saveCurrentFavoriteStack = (
    framework: ProjectScaffoldFramework,
  ): void => {
    const now = new Date().toISOString();
    setFavoriteStacks((current) =>
      saveProjectScaffoldFavorite(
        current,
        {
          name: normalizedFavoriteName,
          frameworkId: framework.id,
          componentIds: selectedComponentIds,
          testingIds: selectedTestingIds,
          toolId: selectedToolId || null,
        },
        now,
        () => globalThis.crypto.randomUUID(),
      ),
    );
  };

  const removeFavoriteStack = (favoriteId: string): void => {
    setFavoriteStacks((current) =>
      deleteProjectScaffoldFavorite(current, favoriteId),
    );
  };

  const handleCreateNewProject = async (): Promise<void> => {
    if (
      !canLaunchScaffoldAgent ||
      !selectedFramework ||
      !onCreateNewProjectAgent
    ) {
      return;
    }

    setIsCreatingProject(true);
    setError(null);
    try {
      await onCreateNewProjectAgent(
        {
          toolId: selectedToolId,
          name: `Scaffold ${selectedFramework.label} project`,
          task: `Scaffold ${selectedFramework.label} project`,
          initialPrompt: scaffoldPrompt,
          commandOverride: "",
          mode: "write",
          target: { kind: "root" },
          branchCheckout: null,
          worktreeBranch: null,
          prepareWorktree: false,
          launchSource: "dialog",
          ...resolveManagedAgentLaunchOptions(selectedToolId),
        },
        normalizedProjectName,
      );
      if (shouldSaveFavorite) {
        saveCurrentFavoriteStack(selectedFramework);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create the project.",
      );
    } finally {
      setIsCreatingProject(false);
    }
  };

  return {
    step,
    setStep,
    selectedFramework,
    frameworkSearch,
    setFrameworkSearch,
    selectedFrameworkCategory,
    setSelectedFrameworkCategory,
    projectName,
    setProjectName,
    shouldSaveFavorite,
    setShouldSaveFavorite,
    favoriteName,
    setFavoriteName,
    favoriteStacks,
    isCreatingProject,
    error,
    selectedComponentIds,
    selectedTestingIds,
    availableTools,
    frameworkCategoryCounts,
    filteredFrameworks,
    selectedToolId,
    setSelectedToolId,
    previousStep,
    nextStep,
    progressSteps,
    stepCopy,
    componentGroups,
    scaffoldPrompt,
    canLaunchScaffoldAgent,
    handleSelectFramework,
    toggleComponent,
    toggleTesting,
    applyFavoriteStack,
    removeFavoriteStack,
    handleCreateNewProject,
  };
}
