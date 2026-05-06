import {
  useWorkspaceSidebarActions,
  useWorkspaceSidebarRuntime,
  useWorkspaceSidebarUi
} from "@/components/app/context/workspaceSidebarContext";
import { useWorkspaceSidebarAllAgents } from "@/components/app/hooks/useWorkspaceSidebarAllAgents";
import { buildWorkspaceCollapseAllMap, useWorkspaceSidebarDerived } from "@/components/app/hooks/useWorkspaceSidebarDerived";
import { useWorkspaceSidebarOverlays } from "@/components/app/hooks/useWorkspaceSidebarOverlays";
import { useWorkspaceSidebarRemoteMounts } from "@/components/app/hooks/useWorkspaceSidebarRemoteMounts";
import { useWorkspaceSidebarSectionState } from "@/components/app/hooks/useWorkspaceSidebarSectionState";
import { CHATBOT_SHORTCUTS } from "@/components/app/logic/chatbotShortcuts";
import { getWorkspaceSidebarTooltip } from "@/components/app/logic/workspaceSidebarPresentation";
import {
  WorkspaceSidebarChatbotsSection,
  WorkspaceSidebarCollapsedRail,
  WorkspaceSidebarPortsSection,
  WorkspaceSidebarRemoteMountsSection
} from "@/components/app/sidebar/WorkspaceSidebarSections";
import { WorkspaceSidebarAllAgentsSection } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarAllAgentsSection";
import { WorkspaceSidebarContextMenus } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarContextMenus";
import { WorkspaceSidebarWorkspaceGroup } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarWorkspaceGroup";
import { WorkspaceSidebarWorkspacesHeader } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarWorkspacesHeader";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";

export const WorkspaceSidebar = () => {
  const snapshot = useCanonicalAppSnapshot();
  const {
    githubToken,
    gitlabToken,
    gitlabHost,
    terminalPresets,
    terminalQuickLaunchDefaults,
    agentsNeedingAttention,
    focusedAgent,
    focusedTerminal,
    removingWorkspaceRoots,
    workspaceTasks,
    workspaceSpecs,
    workspaceNotes,
    aiChatTabs,
    focusedAiChatTabId,
    isCreatingTask,
    isCreatingSpec,
    isCreatingNote
  } = useWorkspaceSidebarRuntime();
  const {
    collapsed,
    collapsedWorkspaceIds,
    isRemoteMountsSectionCollapsed,
    isPortsSectionCollapsed,
    isChatbotsSectionCollapsed,
    onCollapsedWorkspaceIdsChange,
    onRemoteMountsSectionCollapsedChange,
    onPortsSectionCollapsedChange,
    onChatbotsSectionCollapsedChange
  } = useWorkspaceSidebarUi();
  const {
    onChooseProject,
    onCloseProject,
    onRemoveProject,
    onUnmountRemoteMount,
    onChooseProjectAtPath,
    onRefresh,
    onResetWorkspaces,
    onOpenCreateAgent,
    onOpenCreateTerminal,
    onLaunchWorkspaceTerminal,
    onLaunchWorkspaceScript,
    onOpenWorkspaceTerminalPresets,
    onOpenWorkspaceBrowser,
    onFocusWorkspace,
    onFocusWorkspaceView,
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
    taskMenuRef,
    specMenuRef,
    noteMenuRef,
    workspaceMenuRef,
    agentMenuRef,
    terminalMenuRef,
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
    activePorts,
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
    collapsedWorkspaceAgentSectionIds,
    collapsedWorkspaceTerminalSectionIds,
    collapsedWorkspaceAiChatSectionIds,
    collapsedWorkspaceNoteSectionIds,
    collapsedWorkspaceSpecSectionIds,
    collapsedWorkspaceTaskSectionIds,
    toggleWorkspaceAgentSection,
    toggleWorkspaceTerminalSection,
    toggleWorkspaceAiChatSection,
    toggleWorkspaceNoteSection,
    toggleWorkspaceSpecSection,
    toggleWorkspaceTaskSection
  } = useWorkspaceSidebarSectionState();

  const {
    handleChooseProjectAtPath,
    handleUnmountRemoteMount,
    hiddenRemoteMountCount,
    remoteMountActionError,
    setShowAllRemoteMounts,
    showAllRemoteMounts,
    unmountingMountPoint,
    visibleRemoteMounts
  } = useWorkspaceSidebarRemoteMounts({
    activeRemoteMounts: snapshot?.activeRemoteMounts ?? [],
    onChooseProjectAtPath,
    onUnmountRemoteMount
  });

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

  return (
    <Card
      className={cn(
        "h-full min-h-0 overflow-hidden rounded-none border-0 bg-card/95 shadow-none dark:bg-muted/35",
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
            activePortsCount={activePorts.length}
            activeRemoteMountsCount={snapshot.activeRemoteMounts.length}
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
          <>
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
                          collapsedWorkspaceAgentSectionIds={collapsedWorkspaceAgentSectionIds}
                          collapsedWorkspaceTerminalSectionIds={collapsedWorkspaceTerminalSectionIds}
                          collapsedWorkspaceAiChatSectionIds={collapsedWorkspaceAiChatSectionIds}
                          collapsedWorkspaceNoteSectionIds={collapsedWorkspaceNoteSectionIds}
                          collapsedWorkspaceSpecSectionIds={collapsedWorkspaceSpecSectionIds}
                          collapsedWorkspaceTaskSectionIds={collapsedWorkspaceTaskSectionIds}
                          toggleWorkspaceAgentSection={toggleWorkspaceAgentSection}
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
                          onOpenCreateAgent={onOpenCreateAgent}
                          onOpenCreateTerminal={onOpenCreateTerminal}
                          onLaunchWorkspaceTerminal={onLaunchWorkspaceTerminal}
                          onLaunchWorkspaceScript={onLaunchWorkspaceScript}
                          onOpenWorkspaceTerminalPresets={onOpenWorkspaceTerminalPresets}
                          onOpenWorkspaceBrowser={onOpenWorkspaceBrowser}
                          onFocusAgent={onFocusAgent}
                          onFocusTerminal={onFocusTerminal}
                          onFocusWorkspaceAgent={onFocusWorkspaceAgent}
                          onFocusWorkspaceTerminal={onFocusWorkspaceTerminal}
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
                      <div className="border-y border-dashed border-border/70 bg-background/40 px-4 py-4 text-sm text-muted-foreground">
                        Add a repository to start grouping agents by workspace.
                      </div>
                    ) : (
                      <div className="border-y border-dashed border-border/70 bg-background/40 px-4 py-4 text-sm text-muted-foreground">
                        Pick a repository once and it will appear here.
                      </div>
                    )}
                  </div>
                </section>
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
            <WorkspaceSidebarRemoteMountsSection
              activeRemoteMounts={snapshot.activeRemoteMounts}
              visibleRemoteMounts={visibleRemoteMounts}
              hiddenRemoteMountCount={hiddenRemoteMountCount}
              showAllRemoteMounts={showAllRemoteMounts}
              remoteMountActionError={remoteMountActionError}
              unmountingMountPoint={unmountingMountPoint}
              isCollapsed={isRemoteMountsSectionCollapsed}
              onToggleCollapsed={() => onRemoteMountsSectionCollapsedChange((current) => !current)}
              onToggleShowAll={() => setShowAllRemoteMounts((current) => !current)}
              onChooseProjectAtPath={handleChooseProjectAtPath}
              onUnmountRemoteMount={handleUnmountRemoteMount}
            />
            <WorkspaceSidebarPortsSection
              activePorts={activePorts}
              currentProjectRoot={snapshot.project?.rootPath ?? null}
              isCollapsed={isPortsSectionCollapsed}
              onToggleCollapsed={() => onPortsSectionCollapsedChange((current) => !current)}
              onFocusTerminal={onFocusTerminal}
              onFocusWorkspaceTerminal={onFocusWorkspaceTerminal}
              onOpenWorkspaceBrowser={onOpenWorkspaceBrowser}
            />
            <WorkspaceSidebarChatbotsSection
              shortcuts={CHATBOT_SHORTCUTS}
              currentProjectId={snapshot.project?.id ?? null}
              isCollapsed={isChatbotsSectionCollapsed}
              onToggleCollapsed={() => onChatbotsSectionCollapsedChange((current) => !current)}
              onOpenWorkspaceBrowser={onOpenWorkspaceBrowser}
            />
          </>
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
        taskMenuRef={taskMenuRef}
        specMenuRef={specMenuRef}
        noteMenuRef={noteMenuRef}
        workspaceMenuRef={workspaceMenuRef}
        agentMenuRef={agentMenuRef}
        terminalMenuRef={terminalMenuRef}
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
        onRenameTerminal={onRenameTerminal}
        onDestroyTerminal={onDestroyTerminal}
      />
    </Card>
  );
};
