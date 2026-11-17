import type { RealtimeSocketFactory, ScheduleTimer } from "@/types/realtime.types";

/** Adapts the platform `WebSocket` (browser and React Native both provide one) to the realtime socket contract. */
export const createWebSocket: RealtimeSocketFactory = (url, handlers) => {
  const socket = new WebSocket(url);
  socket.onopen = () => handlers.onOpen();
  socket.onmessage = (event: MessageEvent) => {
    if (typeof event.data === "string") handlers.onMessage(event.data);
  };
  socket.onclose = (event: CloseEvent) => handlers.onClose(event.code, event.reason);
  socket.onerror = () => handlers.onError();
  return {
    send: (data) => socket.send(data),
    close: (code, reason) => socket.close(code, reason)
  };
};

export const scheduleTimer: ScheduleTimer = (callback, delayMs) => {
  const handle = setTimeout(callback, delayMs);
  return () => clearTimeout(handle);
};
