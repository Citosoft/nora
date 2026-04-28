import { ipcRenderer } from "electron";

export type IpcPayloadListener<TPayload> = (payload: TPayload) => void;

export function subscribeToIpcEvent<TPayload>(
  channel: string,
  listener: IpcPayloadListener<TPayload>
): () => void {
  const handler = (_event: Electron.IpcRendererEvent, payload: TPayload) => {
    listener(payload);
  };
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}
