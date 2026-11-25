import { UpstreamError } from "../../src/errors/upstreamError";
import type { ExpoPushClient, ExpoPushMessage, ExpoPushTicket } from "../../src/types/push.types";

/** Records each chunk; tokens listed in `unregistered` get a DeviceNotRegistered ticket. */
export class FakeExpoPushClient implements ExpoPushClient {
  readonly chunks: ExpoPushMessage[][] = [];
  readonly unregistered = new Set<string>();
  fail = false;

  async send(messages: readonly ExpoPushMessage[]): Promise<readonly ExpoPushTicket[]> {
    if (this.fail) throw new UpstreamError("expo", 500, "push send rejected");
    this.chunks.push([...messages]);
    return messages.map((message): ExpoPushTicket => this.unregistered.has(message.to)
      ? { kind: "error", deviceNotRegistered: true }
      : { kind: "ok" });
  }

  get messages(): ExpoPushMessage[] {
    return this.chunks.flat();
  }
}
