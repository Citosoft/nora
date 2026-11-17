/** Who is waiting on the user, worded for a notification or toast. */
export interface AttentionNotice {
  conversationId: string;
  /** The waiting bot's name, or the thread title for a Nora thread. */
  who: string;
  title: string;
  body: string;
}
