import {
  useWorkspaceSidebarActions,
  useWorkspaceSidebarRuntime,
  useWorkspaceSidebarUi
} from "@/components/app/context/workspaceSidebarContext";
import { useWorkspaceSidebarAllAgents } from "@/components/app/hooks/useWorkspaceSidebarAllAgents";
import { useWorkspaceSidebarAllThreads } from "@/components/app/hooks/useWorkspaceSidebarAllThreads";
import { buildWorkspaceCollapseAllMap, useWorkspaceSidebarDerived } from "@/components/app/hooks/useWorkspaceSidebarDerived";
import { useWorkspaceSidebarOverlays } from "@/components/app/hooks/useWorkspaceSidebarOverlays";
import { useWorkspaceSidebarSectionState } from "@/components/app/hooks/useWorkspaceSidebarSectionState";
import { getWorkspaceSidebarTooltip } from "@/components/app/logic/workspaceSidebarPresentation";
import {
  WorkspaceSidebarCollapsedRail
} from "@/components/app/sidebar/WorkspaceSidebarSections";
import { WorkspaceSidebarAllAgentsSection } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarAllAgentsSection";
import { WorkspaceSidebarAllThreadsSection } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarAllThreadsSection";
import { WorkspaceSidebarContextMenus } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarContextMenus";
import { WorkspaceSidebarWorkspaceGroup } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarWorkspaceGroup";
import { WorkspaceSidebarWorkspacesHeader } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarWorkspacesHeader";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useState } from "react";

export const WorkspaceSidebar = () => {
  const [editingTerminalSessionId, setEditingTerminalSessionId] = useState<string | null>(null);
  const [editingTerminalNameDraft, setEditingTerminalNameDraft] = useState("");
  const [externalThreadReloadToken, setExternalThreadReloadToken] = useState(0);
  const snapshot = useCanonicalAppSnapshot();
  const {
    githubToken,
    gitlabToken,
    gitlabHost,
    terminalPresets,
    terminalQuickLaunchDefaults,
    defaultAgentTool,
    agentsNeedingAttention,
    focusedAgent,
    focusedTerminal,
    removingWorkspaceRoots,
    workspaceTasks,
    workspaceSpecs,
    workspaceNotes,
    aiChatTabs,
    focusedAiChatTabId,
    focusedBrowserTabId,
    focusedForgeViewerTabId,
    activeWorkspaceContentTab,
    isTaskBoardOpen,
    isSpecBrowserOpen,
    isNoteBrowserOpen,
    isCreatingTask,
    isCreatingSpec,
    isCreatingNote
  } = useWorkspaceSidebarRuntime();
  const {
    collapsed,
    collapsedWorkspaceIds,
    onCollapsedWorkspaceIdsChange,
  } = useWorkspaceSidebarUi();
  const {
    onChooseProject,
    onCloseProject,
    onRemoveProject,
    onRefresh,
    onResetWorkspaces,
    onOpenCreateAgent,
    onOpenCreateTerminal,
    onResumeThread,
    onQuickLaunchAgent,
    onArchiveThread,
    onLaunchWorkspaceTerminal,
    onLaunchWorkspaceScript,
    onOpenWorkspaceTerminalPresets,
    onOpenWorkspaceBrowser,
    onFocusWorkspace,
    onFocusWorkspaceView,
    onFocusWorkspaceWorktree,
    onOpenWorkflowRunChangeRequest,
    onOpenCreateAgentOnWorktree,
    onOpenCreateTerminalOnWorktree,
    onOpenCreateWorktree,
    onLaunchQuickTerminalOnWorktree,
    onCheckoutWorkspaceBranch,
    onLaunchWorktreeScript,
    onRemoveWorktree,
    onFocusAgent,
    onFocusTerminal,
    onFocusWorkspaceAgent,
    onFocusWorkspaceTerminal,
    onRestartAgent,
    onDestroyAgentRequest,
    onRenameTerminal,
    onDestroyTerminal,
    onOpenTask,
    onCreateTask,
    onOpenSpec,
    onCreateSpec,
    onDeleteSpec,
    onGenerateTasksFromSpec,
    onOpenNote,
    onCreateNote,
    onDeleteNote,
    onOpenTaskBoard,
    onOpenSpecBrowser,
    onOpenNoteBrowser,
    onOpenAiChatFromSidebar,
    onFocusWorkspaceAiChatTab,
    onToggleTaskComplete,
    onDeleteTask
  } = useWorkspaceSidebarActions();

  const {
    now,
    activeSessionPopoverId,
    setActiveSessionPopoverId,
    activeTaskMenu,
    activeSpecMenu,
    activeNoteMenu,
    activeWorkspaceMenu,
    activeAgentMenu,
    activeTerminalMenu,
    openTaskMenu,
    openSpecMenu,
    openNoteMenu,
    openWorkspaceMenu,
    openAgentSessionMenu,
    openTerminalSessionMenu,
    openSessionPopover,
    scheduleSessionPopoverClose,
    setActiveTaskMenu,
    setActiveSpecMenu,
    setActiveNoteMenu,
    setActiveWorkspaceMenu,
    setActiveAgentMenu,
    setActiveTerminalMenu
  } = useWorkspaceSidebarOverlays();

  const {
    removingWorkspaceRootSet,
    preferredShellId,
    runnableGlobalTerminalPresets,
    workspaceGroups,
    projectFaviconUrlByProjectId,
    workspaceGroupIds,
    allWorkspaceGroupsCollapsed
  } = useWorkspaceSidebarDerived({
    removingWorkspaceRoots,
    terminalPresets,
    collapsedWorkspaceIds
  });

  const {
    allAgentsGroupBy,
    allAgentsGroupSections,
    allAgentsPrFilter,
    allAgentsWorkspaceFilter,
    allAgentsWorkspaceFilterOptions,
    filteredAllWorkspaceAgentEntries,
    isAllAgentsSectionCollapsed,
    pullRequestStatusByWorkspaceBranch,
    setAllAgentsGroupBy,
    setAllAgentsPrFilter,
    setAllAgentsWorkspaceFilter,
    setIsAllAgentsSectionCollapsed
  } = useWorkspaceSidebarAllAgents({
    workspaceGroups,
    githubToken,
    gitlabToken,
    gitlabHost
  });
  const {
    allThreadsGroupBy,
    allThreadsGroupSections,
    allThreadsHarnessFilter,
    allThreadsHarnessFilterOptions,
    allThreadsWorkspaceFilter,
    allThreadsWorkspaceFilterOptions,
    filteredAllWorkspaceThreadEntries,
    isAllThreadsSectionCollapsed,
    isLoadingAllThreads,
    setAllThreadsGroupBy,
    setAllThreadsHarnessFilter,
    setAllThreadsWorkspaceFilter,
    setIsAllThreadsSectionCollapsed,
    toggleAllThreadsGroupExpanded
  } = useWorkspaceSidebarAllThreads({
    workspaceGroups,
    reloadToken: externalThreadReloadToken
  });

  const {
    collapsedWorkspaceWorktreeSectionIds,
    collapsedWorkspaceAgentSectionIds,
    collapsedWorkspaceThreadSectionIds,
    collapsedWorkspaceTerminalSectionIds,
    collapsedWorkspaceAiChatSectionIds,
    collapsedWorkspaceNoteSectionIds,
    collapsedWorkspaceSpecSectionIds,
    collapsedWorkspaceTaskSectionIds,
    toggleWorkspaceWorktreeSection,
    toggleWorkspaceAgentSection,
    toggleWorkspaceThreadSection,
    toggleWorkspaceTerminalSection,
    toggleWorkspaceAiChatSection,
    toggleWorkspaceNoteSection,
    toggleWorkspaceSpecSection,
    toggleWorkspaceTaskSection
  } = useWorkspaceSidebarSectionState();

  if (!snapshot) {
    return null;
  }

  const handleToggleCollapseAllWorkspaces = () => {
    if (!workspaceGroupIds.length) {
      return;
    }
    const nextCollapsedState = !allWorkspaceGroupsCollapsed;
    onCollapsedWorkspaceIdsChange((current) => ({
      ...current,
      ...buildWorkspaceCollapseAllMap(workspaceGroupIds, nextCollapsedState)
    }));
  };
  const handleBeginTerminalRename = (sessionId: string, currentName: string) => {
    setEditingTerminalSessionId(sessionId);
    setEditingTerminalNameDraft(currentName);
  };
  const handleCancelTerminalRename = () => {
    setEditingTerminalSessionId(null);
    setEditingTerminalNameDraft("");
  };
  const handleSubmitTerminalRename = (sessionId: string, currentName: string) => {
    const nextName = editingTerminalNameDraft.trim();
    const previousName = currentName.trim();
    if (!nextName || nextName === previousName) {
      handleCancelTerminalRename();
      return;
    }
    void onRenameTerminal(sessionId, nextName);
    handleCancelTerminalRename();
  };

  return (
    <Card
      className={cn(
        "workspace-shell-surface h-full min-h-0 overflow-hidden rounded-none border-0 bg-card/95 shadow-none dark:bg-muted/35",
        collapsed && "workspace-sidebar-collapsed-surface"
      )}
    >
      <CardContent className="flex h-full min-h-0 flex-col gap-0 p-0">
        {collapsed ? (
          <WorkspaceSidebarCollapsedRail
            workspaceGroups={workspaceGroups}
            projectFaviconUrlByProjectId={projectFaviconUrlByProjectId}
            workspaceTasksCount={workspaceTasks.length}
            workspaceSpecsCount={workspaceSpecs.length}
            workspaceNotesCount={workspaceNotes.length}
            focusedWorkspaceId={snapshot.project?.id ?? null}
            onChooseProject={onChooseProject}
            onRefresh={onRefresh}
            onResetWorkspaces={onResetWorkspaces}
            onCloseProject={onCloseProject}
            onFocusWorkspace={onFocusWorkspace}
            hasActiveProject={Boolean(snapshot.project)}
            renderWorkspaceTitle={getWorkspaceSidebarTooltip}
          />
        ) : (
          <div className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="pb-4">
              <section>
                {snapshot.project ? (
                  <WorkspaceSidebarWorkspacesHeader
                    variant="active-project"
                    workspaceGroupIds={workspaceGroupIds}
                    allWorkspaceGroupsCollapsed={allWorkspaceGroupsCollapsed}
                    onChooseProject={onChooseProject}
                    onToggleCollapseAllWorkspaces={handleToggleCollapseAllWorkspaces}
                    onRefresh={onRefresh}
                    onResetWorkspaces={onResetWorkspaces}
                    onCloseProject={onCloseProject}
                  />
                ) : (
                  <WorkspaceSidebarWorkspacesHeader
                    variant="no-project"
                    workspaceGroupIds={workspaceGroupIds}
                    allWorkspaceGroupsCollapsed={allWorkspaceGroupsCollapsed}
                    onChooseProject={onChooseProject}
                    onToggleCollapseAllWorkspaces={handleToggleCollapseAllWorkspaces}
                    onResetWorkspaces={onResetWorkspaces}
                  />
                )}
                <div>
                  {workspaceGroups.length ? (
                    workspaceGroups.map((workspace) => (
                      <WorkspaceSidebarWorkspaceGroup
                        key={workspace.project.id}
                        workspace={workspace}
                        removingWorkspaceRootSet={removingWorkspaceRootSet}
                        projectFaviconUrlByProjectId={projectFaviconUrlByProjectId}
                        collapsedWorkspaceIds={collapsedWorkspaceIds}
                        onCollapsedWorkspaceIdsChange={onCollapsedWorkspaceIdsChange}
                        collapsedWorkspaceWorktreeSectionIds={collapsedWorkspaceWorktreeSectionIds}
                        collapsedWorkspaceAgentSectionIds={collapsedWorkspaceAgentSectionIds}
                        collapsedWorkspaceThreadSectionIds={collapsedWorkspaceThreadSectionIds}
                        collapsedWorkspaceTerminalSectionIds={collapsedWorkspaceTerminalSectionIds}
                        collapsedWorkspaceAiChatSectionIds={collapsedWorkspaceAiChatSectionIds}
                        collapsedWorkspaceNoteSectionIds={collapsedWorkspaceNoteSectionIds}
                        collapsedWorkspaceSpecSectionIds={collapsedWorkspaceSpecSectionIds}
                        collapsedWorkspaceTaskSectionIds={collapsedWorkspaceTaskSectionIds}
                        externalThreadReloadToken={externalThreadReloadToken}
                        toggleWorkspaceWorktreeSection={toggleWorkspaceWorktreeSection}
                        toggleWorkspaceAgentSection={toggleWorkspaceAgentSection}
                        toggleWorkspaceThreadSection={toggleWorkspaceThreadSection}
                        toggleWorkspaceTerminalSection={toggleWorkspaceTerminalSection}
                        toggleWorkspaceAiChatSection={toggleWorkspaceAiChatSection}
                        toggleWorkspaceNoteSection={toggleWorkspaceNoteSection}
                        toggleWorkspaceSpecSection={toggleWorkspaceSpecSection}
                        toggleWorkspaceTaskSection={toggleWorkspaceTaskSection}
                        workspaceTasks={workspaceTasks}
                        workspaceSpecs={workspaceSpecs}
                        workspaceNotes={workspaceNotes}
                        aiChatTabs={aiChatTabs}
                        focusedAiChatTabId={focusedAiChatTabId}
                        focusedBrowserTabId={focusedBrowserTabId}
                        focusedForgeViewerTabId={focusedForgeViewerTabId}
                        activeWorkspaceContentTab={activeWorkspaceContentTab}
                        isTaskBoardOpen={isTaskBoardOpen}
                        isSpecBrowserOpen={isSpecBrowserOpen}
                        isNoteBrowserOpen={isNoteBrowserOpen}
                        isCreatingTask={isCreatingTask}
                        isCreatingSpec={isCreatingSpec}
                        isCreatingNote={isCreatingNote}
                        pullRequestStatusByWorkspaceBranch={pullRequestStatusByWorkspaceBranch}
                        agentsNeedingAttention={agentsNeedingAttention}
                        now={now}
                        focusedAgent={focusedAgent}
                        focusedTerminal={focusedTerminal}
                        preferredShellId={preferredShellId}
                        terminalQuickLaunchDefaults={terminalQuickLaunchDefaults}
                        defaultAgentTool={defaultAgentTool}
                        runnableGlobalTerminalPresets={runnableGlobalTerminalPresets}
                        activeSessionPopoverId={activeSessionPopoverId}
                        setActiveSessionPopoverId={setActiveSessionPopoverId}
                        openSessionPopover={openSessionPopover}
                        scheduleSessionPopoverClose={scheduleSessionPopoverClose}
                        openAgentSessionMenu={openAgentSessionMenu}
                        openTerminalSessionMenu={openTerminalSessionMenu}
                        openTaskMenu={openTaskMenu}
                        openSpecMenu={openSpecMenu}
                        openNoteMenu={openNoteMenu}
                        openWorkspaceMenu={openWorkspaceMenu}
                        onFocusWorkspace={onFocusWorkspace}
                        onFocusWorkspaceView={onFocusWorkspaceView}
                        onFocusWorkspaceWorktree={onFocusWorkspaceWorktree}
                        onOpenWorkflowRunChangeRequest={onOpenWorkflowRunChangeRequest}
                        onOpenCreateAgentOnWorktree={onOpenCreateAgentOnWorktree}
                        onOpenCreateTerminalOnWorktree={onOpenCreateTerminalOnWorktree}
                        onOpenCreateWorktree={onOpenCreateWorktree}
                        onLaunchQuickTerminalOnWorktree={onLaunchQuickTerminalOnWorktree}
                        onCheckoutWorkspaceBranch={onCheckoutWorkspaceBranch}
                        onLaunchWorktreeScript={onLaunchWorktreeScript}
                        onRemoveWorktree={onRemoveWorktree}
                        onOpenCreateAgent={onOpenCreateAgent}
                        onResumeThread={onResumeThread}
                        onQuickLaunchAgent={onQuickLaunchAgent}
                        onArchiveThread={onArchiveThread}
                        onOpenCreateTerminal={onOpenCreateTerminal}
                        onLaunchWorkspaceTerminal={onLaunchWorkspaceTerminal}
                        onLaunchWorkspaceScript={onLaunchWorkspaceScript}
                        onOpenWorkspaceTerminalPresets={onOpenWorkspaceTerminalPresets}
                        onOpenWorkspaceBrowser={onOpenWorkspaceBrowser}
                        onFocusAgent={onFocusAgent}
                        onFocusTerminal={onFocusTerminal}
                        onFocusWorkspaceAgent={onFocusWorkspaceAgent}
                        onFocusWorkspaceTerminal={onFocusWorkspaceTerminal}
                        editingTerminalSessionId={editingTerminalSessionId}
                        editingTerminalNameDraft={editingTerminalNameDraft}
                        onEditingTerminalNameDraftChange={setEditingTerminalNameDraft}
                        onSubmitTerminalRename={handleSubmitTerminalRename}
                        onCancelTerminalRename={handleCancelTerminalRename}
                        onOpenTask={onOpenTask}
                        onCreateTask={onCreateTask}
                        onOpenTaskBoard={onOpenTaskBoard}
                        onOpenSpec={onOpenSpec}
                        onCreateSpec={onCreateSpec}
                        onOpenSpecBrowser={onOpenSpecBrowser}
                        onOpenNote={onOpenNote}
                        onCreateNote={onCreateNote}
                        onOpenNoteBrowser={onOpenNoteBrowser}
                        onFocusWorkspaceAiChatTab={onFocusWorkspaceAiChatTab}
                        onOpenAiChatFromSidebar={onOpenAiChatFromSidebar}
                        onRemoveProject={onRemoveProject}
                      />
                    ))
                  ) : snapshot.project ? (
                    <div className="mx-2 rounded-[4px] border border-dashed border-border/60 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
                      Add a project folder to start grouping agents by project.
                    </div>
                  ) : (
                    <div className="mx-2 rounded-[4px] border border-dashed border-border/60 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
                      Pick a project folder once and it will appear here.
                    </div>
                  )}
                </div>
              </section>
              <WorkspaceSidebarAllThreadsSection
                allThreadsWorkspaceFilter={allThreadsWorkspaceFilter}
                setAllThreadsWorkspaceFilter={setAllThreadsWorkspaceFilter}
                allThreadsWorkspaceFilterOptions={allThreadsWorkspaceFilterOptions}
                allThreadsHarnessFilter={allThreadsHarnessFilter}
                setAllThreadsHarnessFilter={setAllThreadsHarnessFilter}
                allThreadsHarnessFilterOptions={allThreadsHarnessFilterOptions}
                allThreadsGroupBy={allThreadsGroupBy}
                setAllThreadsGroupBy={setAllThreadsGroupBy}
                isAllThreadsSectionCollapsed={isAllThreadsSectionCollapsed}
                setIsAllThreadsSectionCollapsed={setIsAllThreadsSectionCollapsed}
                filteredAllWorkspaceThreadEntries={filteredAllWorkspaceThreadEntries}
                allThreadsGroupSections={allThreadsGroupSections}
                onToggleGroupExpanded={toggleAllThreadsGroupExpanded}
                isLoadingAllThreads={isLoadingAllThreads}
                onResumeThread={onResumeThread}
                onArchiveThread={onArchiveThread}
                onThreadsChanged={() => setExternalThreadReloadToken((current) => current + 1)}
              />
              <WorkspaceSidebarAllAgentsSection
                focusedAgent={focusedAgent}
                now={now}
                allAgentsWorkspaceFilter={allAgentsWorkspaceFilter}
                setAllAgentsWorkspaceFilter={setAllAgentsWorkspaceFilter}
                allAgentsWorkspaceFilterOptions={allAgentsWorkspaceFilterOptions}
                allAgentsPrFilter={allAgentsPrFilter}
                setAllAgentsPrFilter={setAllAgentsPrFilter}
                allAgentsGroupBy={allAgentsGroupBy}
                setAllAgentsGroupBy={setAllAgentsGroupBy}
                isAllAgentsSectionCollapsed={isAllAgentsSectionCollapsed}
                setIsAllAgentsSectionCollapsed={setIsAllAgentsSectionCollapsed}
                filteredAllWorkspaceAgentEntries={filteredAllWorkspaceAgentEntries}
                allAgentsGroupSections={allAgentsGroupSections}
                openAgentSessionMenu={openAgentSessionMenu}
                onFocusAgent={onFocusAgent}
                onFocusWorkspaceAgent={onFocusWorkspaceAgent}
              />
            </div>
          </div>
        )}
      </CardContent>
      <WorkspaceSidebarContextMenus
        workspaceGroups={workspaceGroups}
        focusedProjectId={snapshot.project?.id ?? null}
        terminalShells={snapshot.terminalShells}
        preferredShellId={preferredShellId}
        terminalQuickLaunchDefaults={terminalQuickLaunchDefaults}
        runnableGlobalTerminalPresets={runnableGlobalTerminalPresets}
        activeTaskMenu={activeTaskMenu}
        activeSpecMenu={activeSpecMenu}
        activeNoteMenu={activeNoteMenu}
        activeWorkspaceMenu={activeWorkspaceMenu}
        activeAgentMenu={activeAgentMenu}
        activeTerminalMenu={activeTerminalMenu}
        setActiveTaskMenu={setActiveTaskMenu}
        setActiveSpecMenu={setActiveSpecMenu}
        setActiveNoteMenu={setActiveNoteMenu}
        setActiveWorkspaceMenu={setActiveWorkspaceMenu}
        setActiveAgentMenu={setActiveAgentMenu}
        setActiveTerminalMenu={setActiveTerminalMenu}
        onToggleTaskComplete={onToggleTaskComplete}
        onDeleteTask={onDeleteTask}
        onGenerateTasksFromSpec={onGenerateTasksFromSpec}
        onDeleteSpec={onDeleteSpec}
        onDeleteNote={onDeleteNote}
        onOpenCreateAgent={onOpenCreateAgent}
        onFocusWorkspace={onFocusWorkspace}
        onOpenWorkspaceBrowser={onOpenWorkspaceBrowser}
        onLaunchWorkspaceTerminal={onLaunchWorkspaceTerminal}
        onOpenCreateTerminal={onOpenCreateTerminal}
        onOpenWorkspaceTerminalPresets={onOpenWorkspaceTerminalPresets}
        onCreateTask={onCreateTask}
        onCreateSpec={onCreateSpec}
        onRemoveProject={onRemoveProject}
        onFocusAgent={onFocusAgent}
        onFocusWorkspaceAgent={onFocusWorkspaceAgent}
        onRestartAgent={onRestartAgent}
        onDestroyAgentRequest={onDestroyAgentRequest}
        onBeginTerminalRename={handleBeginTerminalRename}
        onDestroyTerminal={onDestroyTerminal}
      />
    </Card>
  );
};
