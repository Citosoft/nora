import type { FocusedAgentInjectableContext } from "@/components/app/types/focusedAgentPanelParts.types";
import type { PastedImageDraft, WorkspacePathAttachmentDraft } from "@/components/app/types/agentInput.types";
import type { AgentSession, TerminalSession } from "@shared/appTypes";
import type { ClipboardEvent as ReactClipboardEvent, DragEvent as ReactDragEvent, RefObject } from "react";

export type FocusedAgentSessionToolbarProps = {
  compact: boolean;
  agent: AgentSession | null;
  terminal: TerminalSession | null;
  focusedSession: AgentSession | TerminalSession | null;
  onToggleSessionInfo: () => void;
  onToggleContext: () => void;
  onClearTerminal: () => void | Promise<void>;
  onRestart: () => void | Promise<void>;
  onDestroy: () => void;
};

export type FocusedAgentSessionDetailsPopoverProps = {
  infoPopoverRef: RefObject<HTMLDivElement | null>;
  agent: AgentSession | null;
  terminal: TerminalSession | null;
};

export type FocusedAgentInputComposerProps = {
  agent: AgentSession | null;
  pastedImages: PastedImageDraft[];
  attachedWorkspacePaths: WorkspacePathAttachmentDraft[];
  injectableContexts: FocusedAgentInjectableContext[];
  isLoadingInjectableContexts: boolean;
  isSendingTerminalInput: boolean;
  isSavingPastedImage: boolean;
  canSendLiveTerminalInput: boolean;
  onRemovePastedImage: (draftId: string) => void;
  onRemoveAttachedPath: (draftId: string) => void;
  onOpenImagePreview: (draft: PastedImageDraft) => void;
  onInjectContext: (context: FocusedAgentInjectableContext) => void;
  onDragOver: (event: ReactDragEvent<HTMLInputElement>) => void;
  onDrop: (event: ReactDragEvent<HTMLInputElement>) => void;
  onPaste: (event: ReactClipboardEvent<HTMLInputElement>) => void | Promise<void>;
  onSend: () => void | Promise<void>;
  inputRef: RefObject<HTMLInputElement | null>;
};
