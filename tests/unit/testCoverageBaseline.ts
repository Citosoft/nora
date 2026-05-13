/**
 * Inventory of automated tests under `tests/unit/` and known gaps for vertical-slice refactors.
 * Update this file when you add coverage for a new domain slice.
 */

export const orchestratorTestModules = [
  "tests/unit/main/orchestrator/sessionCreation.createAgent.test.ts",
  "tests/unit/main/orchestrator/runtime.test.ts",
  "tests/unit/main/orchestrator/shell.test.ts",
  "tests/unit/main/orchestrator/agentLaunch.test.ts",
  "tests/unit/main/orchestrator/agentBusyActivity.test.ts",
  "tests/unit/main/orchestrator/agentContextSourceSummary.test.ts",
  "tests/unit/main/orchestrator/terminalPerformance.test.ts",
  "tests/unit/main/orchestrator/terminalLineExtraction.test.ts",
  "tests/unit/main/orchestrator/claudeHarnessContext.test.ts",
  "tests/unit/main/orchestrator/codexHarnessContext.test.ts",
  "tests/unit/main/orchestrator/geminiHarnessContext.test.ts",
  "tests/unit/main/orchestrator/cursorHarnessContext.test.ts"
] as const;

export const rendererHelperTestModules = [
  "tests/unit/renderer/agentContextSelections.test.ts",
  "tests/unit/renderer/appUiFonts.test.ts",
  "tests/unit/renderer/appPersistence.onboarding.test.ts",
  "tests/unit/renderer/appStateDelta.test.ts",
  "tests/unit/renderer/startupDialogVisibility.test.ts",
  "tests/unit/renderer/workspaceSessionTabContextActions.test.ts",
  "tests/unit/renderer/terminalQuickLaunch.test.ts",
  "tests/unit/renderer/workspaceAiChatToolUtils.test.ts",
  "tests/unit/renderer/browserTabNavigation.test.ts",
  "tests/unit/renderer/aiChatSelection.test.ts",
  "tests/unit/renderer/workspaceSplitViewUtils.test.ts"
] as const;

/** High-value gaps to close next (orchestration / layout / session shell). */
export const prioritizedCoverageGaps = [
  "File tree drag/drop and browser-image import paths (FileTreePanel)",
  "IPC-free integration tests for forge session props wiring (optional, heavier)",
  "Further Orchestrator class method grouping after git command extraction"
] as const;

export type TestCoverageBaseline = {
  orchestratorTestModules: typeof orchestratorTestModules;
  rendererHelperTestModules: typeof rendererHelperTestModules;
  prioritizedCoverageGaps: typeof prioritizedCoverageGaps;
};

export const testCoverageBaseline: TestCoverageBaseline = {
  orchestratorTestModules,
  rendererHelperTestModules,
  prioritizedCoverageGaps
};
