import type { ConversationSubscriber, WindowSubscriptions } from "@main/types/execution/gateway.types";
import type { ConversationWatchReceipt, UnwatchConversationRequest, WatchConversationRequest } from "@shared/ipc/types/conversationGateway.types";
import { conversationChannels } from "@shared/conversations/gateway";
import { commandFingerprint } from "./commandIdentity";
import { ExecutionCommandError } from "./errors";
import type { ConversationGateway } from "./gateway";

const closeSignals = ["destroyed", "did-start-navigation", "render-process-gone"] as const;

/** One lifecycle listener per window, regardless of how many panes watch conversations. */
export class ViewSubscriptions {
  private readonly windows = new Map<number, WindowSubscriptions>();
  constructor(private readonly gateway: ConversationGateway) {}
  private key(request: UnwatchConversationRequest): string { return JSON.stringify([request.environmentId, request.watchId]); }
  watch(sender: ConversationSubscriber, request: WatchConversationRequest): ConversationWatchReceipt {
    const key = this.key(request);
    const current = this.windows.get(sender.id);
    const fingerprint = commandFingerprint(request);
    const previous = current?.watches.get(key);
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new ExecutionCommandError("conflict", "Watch ID already belongs to another conversation");
      return previous.receipt;
    }
    const total = [...this.windows.values()].reduce((count, window) => count + window.watches.size, 0);
    if ((current?.watches.size ?? 0) >= 64 || total >= 512) throw new ExecutionCommandError("conflict", "Close unused conversation views before opening more subscriptions");
    const handle = this.gateway.watch(request, (hint) => {
      if (sender.isDestroyed()) this.closeWindow(sender.id);
      else { try { sender.send(conversationChannels.cursor, hint); } catch { this.closeWindow(sender.id); } }
    });
    let window = current;
    if (!window) {
      window = { sender, watches: new Map(), onClosed: () => this.closeWindow(sender.id) };
      this.windows.set(sender.id, window);
      for (const signal of closeSignals) sender.once(signal, window.onClosed);
    }
    window.watches.set(key, { ...handle, fingerprint });
    return handle.receipt;
  }
  unwatch(senderId: number, request: UnwatchConversationRequest): void {
    const window = this.windows.get(senderId);
    const key = this.key(request);
    const watch = window?.watches.get(key);
    if (!window || !watch) return;
    window.watches.delete(key); watch.cancel();
    if (!window.watches.size) this.closeWindow(senderId);
  }
  private closeWindow(senderId: number): void {
    const window = this.windows.get(senderId);
    if (!window) return;
    this.windows.delete(senderId);
    for (const watch of window.watches.values()) watch.cancel();
    for (const signal of closeSignals) window.sender.removeListener(signal, window.onClosed);
  }
  dispose(): void { for (const senderId of this.windows.keys()) this.closeWindow(senderId); }
}
