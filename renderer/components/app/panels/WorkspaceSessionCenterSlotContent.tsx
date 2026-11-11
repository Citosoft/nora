import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import type { AiChatReasoningLevel, AiChatMessage, FileEditorTab, ResolvedTheme } from "@/components/app/types";
import type { FileEditorAgentSendTarget } from "@/components/app/types/fileEditor.types";
import type { OpenWorkspaceFileEditorOptions } from "@/components/app/types/workflow.types";
import type { ForgeDetailPanelProps } from "@/components/app/types/panel.types";
import type { WorkspaceSessionCenterSlot } from "@/components/app/types/workspaceSessionCenterSlots.types";
import { DiffViewer } from "@/components/app/panels/DiffViewer";
import { FileEditorPanel } from "@/components/app/panels/FileEditorPanel";
import { ThreadWorkspaceCenter } from "@/components/app/panels/threads/ThreadWorkspaceCenter";
import { ForgeDetailPanel } from "@/components/app/panels/ForgePanel";
import { ForgeWorkflowRunPanel } from "@/components/app/panels/ForgeWorkflowRunPanel";
import { FullDiffViewer } from "@/components/app/panels/FullDiffViewer";
import type { ForgeViewerTabState } from "@/components/app/types";
import type { ChangeEntry } from "@shared/appTypes";
import type {
  AgentCatalogEntry,
  AgentSession,
  AiModelCatalogEntry,
  AiProvider,
  AiSettings,
  ForgeOverview,
} from "@shared/appTypes";

export type WorkspaceSessionCenterSlotContentProps = {
  slot: WorkspaceSessionCenterSlot;
  resolvedTheme: ResolvedTheme;
  snapshotChanges: ChangeEntry[];
  onCloseExpandedDiff: () => void;
  activeSpecEditorTab: FileEditorTab | null;
  onGenerateTasksFromSpec: (projectId: string, pathName: string) => void;
  fileEditorAgentSendTargets: FileEditorAgentSendTarget[];
  onExitFileEditorForAgentHandoff: () => void;
  onOpenFileEditor: (pathName: string, options?: OpenWorkspaceFileEditorOptions) => Promise<void>;
  onCloseActiveFileEditorTab: () => void;
  forgeViewerTab: ForgeViewerTabState | null;
  forgeDetailProps: Pick<
    ForgeDetailPanelProps,
    | "detail"
    | "detailLoading"
    | "detailErrorMessage"
    | "actionLoading"
    | "commentLoading"
    | "onOpenUrl"
    | "onOpenInViewer"
    | "onBackToList"
    | "onRefreshDetail"
    | "onAction"
    | "onCommentSubmit"
    | "onSpawnIssueAgent"
    | "onSpawnReviewAgent"
  >;
  stableTools: AgentCatalogEntry[];
  forgeOverview: ForgeOverview | null;
  aiSettings: AiSettings;
  aiModelOptions: Record<AiProvider, AiModelCatalogEntry[]>;
  aiModelLoading: Record<AiProvider, boolean>;
  onSelectAiChatProviderModel: (provider: AiProvider, model: string) => void;
  onOpenAiSettings: () => void;
  onUpdateAiChatTabReasoningMode: (tabId: string, mode: AiChatReasoningLevel) => void;
  onUpdateAiChatTabTitle: (tabId: string, title: string) => void;
  onUpdateAiChatTabMessages: (tabId: string, updater: (current: AiChatMessage[]) => AiChatMessage[]) => void;
  stableAgent: AgentSession | null;
};

export function WorkspaceSessionCenterSlotContent(props: WorkspaceSessionCenterSlotContentProps) {
  const { slot } = props;
  const { route } = useWorkspaceNavigation();


  switch (slot.kind) {
    case "diff-full":
      return <FullDiffViewer changes={props.snapshotChanges} resolvedTheme={props.resolvedTheme} />;
    case "diff-file":
      return (
        <DiffViewer
          change={slot.payload.change}
          expanded
          resolvedTheme={props.resolvedTheme}
          onClose={props.onCloseExpandedDiff}
        />
      );
    case "file-editor": {
      if (route?.tool === "documents") return null;
      const specTab = props.activeSpecEditorTab;
      return (
        <FileEditorPanel
          title="File editor"
          showTabStrip={false}
          onGenerateTasks={
            specTab ? () => props.onGenerateTasksFromSpec(specTab.projectId, specTab.path) : null
          }
          agentSendTargets={props.fileEditorAgentSendTargets}
          onExitFileEditorForAgentHandoff={props.onExitFileEditorForAgentHandoff}
          onOpenFileEditor={props.onOpenFileEditor}
          onClose={props.onCloseActiveFileEditorTab}
        />
      );
    }
    case "forge":
      if (!props.forgeViewerTab) {
        return (
          <div className="flex flex-1 items-center justify-center bg-card/95 text-sm text-muted-foreground">
            Open a Forge item from the sidebar to load details here.
          </div>
        );
      }
      if (props.forgeViewerTab.kind === "workflow_run") {
        return (
          <ForgeWorkflowRunPanel
            projectId={props.forgeViewerTab.projectId}
            runId={props.forgeViewerTab.number}
            onOpenUrl={props.forgeDetailProps.onOpenUrl}
          />
        );
      }
      return (
        <ForgeDetailPanel
          {...props.forgeDetailProps}
          resolvedTheme={props.resolvedTheme}
          tools={props.stableTools}
          repoFullName={props.forgeOverview?.repo?.fullName ?? null}
          repoProvider={props.forgeOverview?.repo?.provider ?? "github"}
        />
      );
    case "ai-chat":
      return <div className="p-6 text-sm text-muted-foreground">This conversation belongs to archived chat history.</div>;
    case "agent-terminal":
      return <ThreadWorkspaceCenter />;
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
}
