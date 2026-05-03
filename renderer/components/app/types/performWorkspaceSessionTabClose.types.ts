export type WorkspaceSessionTabCloseHandlers = {
  closeAgent: (agentId: string) => void;
  closeTerminal: (sessionId: string) => void;
  closeBrowser: (browserTabId: string) => void;
  closeForge: (forgeTabId: string) => void;
  closeAiChat: (aiChatTabId: string) => void;
  deleteSplitView: (viewId: string) => void;
  closeFileEditorAtPath: (path: string) => void;
  closeDiff: () => void;
};
