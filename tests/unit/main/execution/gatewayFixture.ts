import { EventEmitter } from "node:events";
import { registerConversationIpc } from "@main/ipc/registerConversationIpc";
import { createConversationBridge } from "@main/preload/createConversationBridge";
import type { ConversationCursorHint } from "@shared/ipc/types/conversationGateway.types";
import type { ConversationIpc, ConversationSubscriber, GatewayDependencies } from "@main/types/execution/gateway.types";

export class FixtureSubscriber extends EventEmitter implements ConversationSubscriber {
  destroyed = false;
  allowed = true;
  readonly hints = new Set<(hint: ConversationCursorHint) => void>();
  constructor(readonly id: number) { super(); }
  isDestroyed(): boolean { return this.destroyed; }
  send(_channel: string, hint: ConversationCursorHint): void { for (const listener of this.hints) listener(hint); }
  destroy(): void { this.destroyed = true; this.emit("destroyed"); }
}

export class GatewayFixture implements ConversationIpc {
  readonly handlers = new Map<string, Parameters<ConversationIpc["handle"]>[1]>();
  readonly dispose: () => void;
  constructor(deps: GatewayDependencies) {
    this.dispose = registerConversationIpc({ ...deps, ipc: this, isAllowedSender: (event) => event.senderFrame?.url === "app://nora" });
  }
  handle(channel: string, listener: Parameters<ConversationIpc["handle"]>[1]): void {
    if (this.handlers.has(channel)) throw new Error("Channel has multiple owners");
    this.handlers.set(channel, listener);
  }
  removeHandler(channel: string): void { this.handlers.delete(channel); }
  async invoke(sender: FixtureSubscriber, channel: string, payload: unknown) {
    const handler = this.handlers.get(channel);
    if (!handler) throw new Error("Conversation handler missing");
    return handler({ sender, senderFrame: { url: sender.allowed ? "app://nora" : "https://untrusted.example" } }, payload);
  }
  bridge(sender: FixtureSubscriber) {
    return createConversationBridge({ invoke: (channel, payload) => this.invoke(sender, channel, payload),
      onCursor: (listener) => { sender.hints.add(listener); return () => { sender.hints.delete(listener); }; } });
  }
}
