export const normalizeAiChatPanelPathKey = (path: string): string => {
  return path.trim().replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
};
