import type { TerminalSubmission, WindowUiState, ResolvedTheme, TerminalFontId, TerminalThemeId } from "@/components/app/types";
import type { PastedImageDraft, WorkspacePathAttachmentDraft } from "@/components/app/types/agentInput.types";
import type { FocusedAgentWorkspaceHomeProps } from "@/components/app/types/focusedAgentEmptyState.types";
import type { FocusedAgentContextSelectorState } from "@/components/app/types/focusedAgentPanelParts.types";
import type { WorkspaceTaskDragPayload } from "@/components/app/types/workspaceTaskDrag.types";
import type { AgentContextState, AgentSession, AppState, TerminalSession, WorkspaceSummary } from "@shared/appTypes";
import type {
  ClipboardEvent as ReactClipboardEvent,
  Dispatch,
  DragEvent as ReactDragEvent,
  RefObject,
  SetStateAction
} from "react";

export type UseFocusedAgentPanelSessionArgs = {
  agent: AgentSession | null;
  terminal: TerminalSession | null;
};

export type UseFocusedAgentPanelSessionResult = {
  project: AppState["project"];
  workspace: WorkspaceSummary | null;
  platform: WindowUiState["platform"];
  resolvedTheme: ResolvedTheme;
  terminalThemeId: TerminalThemeId;
  terminalFontId: TerminalFontId;
  onChooseProject: () => Promise<AppState | null>;
  onDestroyRequest: (agentId: string) => void;
  onDestroyTerminal: (sessionId: string) => Promise<AppState | null>;
  workspaceProjectFaviconUrl: string | null;
  addWorkspaceShortcutParts: string[];
  noSessionWorkspaceHome: FocusedAgentWorkspaceHomeProps | null;
  showContext: boolean;
  setShowContext: Dispatch<SetStateAction<boolean>>;
  showInfo: boolean;
  setShowInfo: Dispatch<SetStateAction<boolean>>;
  contextState: AgentContextState | null;
  contextStatus: "idle" | "loading";
  isClearingContext: boolean;
  handleClearContext: () => Promise<void>;
  handleCopyContextReference: (value: string) => Promise<void>;
  pastedImages: PastedImageDraft[];
  attachedWorkspacePaths: WorkspacePathAttachmentDraft[];
  previewImageDraft: PastedImageDraft | null;
  setPreviewImageDraft: Dispatch<SetStateAction<PastedImageDraft | null>>;
  isSendingTerminalInput: boolean;
  isSavingPastedImage: boolean;
  contextSelector: FocusedAgentContextSelectorState;
  isLoadingContextSources: boolean;
  isVoiceTranscriptionReady: boolean;
  isVoiceInputSupported: boolean;
  isListeningVoiceInput: boolean;
  isTranscribingVoiceInput: boolean;
  voiceInputLevels: number[];
  terminalSubmission: TerminalSubmission | null;
  terminalResetVersion: number;
  infoPopoverRef: RefObject<HTMLDivElement | null>;
  terminalInputRef: RefObject<HTMLInputElement | null>;
  activeSessionId: string | null;
  focusedSession: AgentSession | TerminalSession | null;
  isPreparingWorktree: boolean;
  sessionWorkspaceAbsoluteRoot: string | null;
  canSendLiveTerminalInput: boolean;
  buildTaskInstructionText: (taskReference: WorkspaceTaskDragPayload) => string;
  handleClearTerminal: () => Promise<void>;
  handleRestart: () => Promise<void>;
  handleSendTerminalInput: () => Promise<void>;
  handleToggleVoiceInput: () => void;
  handleChangeContextSelections: (next: FocusedAgentContextSelectorState["selections"]) => void;
  handleAgentInputPaste: (event: ReactClipboardEvent<HTMLInputElement>) => Promise<void>;
  handleRemovePastedImage: (draftId: string) => void;
  handleRemoveAttachedWorkspacePath: (draftId: string) => void;
  handleAgentInputDragOver: (event: ReactDragEvent<HTMLInputElement>) => void;
  handleAgentInputDrop: (event: ReactDragEvent<HTMLInputElement>) => void;
};
