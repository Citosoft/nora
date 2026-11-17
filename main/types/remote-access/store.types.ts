import type { z } from "zod";
import type { remoteStateSchema } from "@main/remote-access/stateSchema";
import type { SecretCodec } from "@main/types/secretEncryption.types";

export type RemoteState = z.infer<typeof remoteStateSchema>;
export interface RemoteStateStore {
  load(): Promise<RemoteState>;
  save(state: RemoteState): Promise<void>;
  encrypt(token: string): string;
  decrypt(token: string): string;
}
export interface RemoteStoreOptions {
  path: string;
  codec: SecretCodec;
  name: string;
  nextId(): string;
}
