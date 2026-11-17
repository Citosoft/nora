export interface AttentionBridge {
  /** Fires when the user clicks a "needs your approval" notification. */
  onOpenThread(listener: (conversationId: string) => void): () => void;
}
