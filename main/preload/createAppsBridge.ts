import { appsInstallRequestedChannel, appsBuildingChannel, appsChangedChannel, appsChannel, appsDataChannel, appsReplySchema } from "@shared/apps/gateway";
import type { AppsBridge } from "@shared/ipc/types/appsGateway.types";
import type { AppBuildStep, AppRenderData, AppSummary } from "@shared/types/apps/apps.types";
import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createAppsBridge(): AppsBridge {
  return {
    onInstallRequested: (listener) => subscribeToIpcEvent<string>(appsInstallRequestedChannel, listener),
    async request(input) {
      const reply = appsReplySchema.safeParse(await invokeIpc(appsChannel, input));
      if (!reply.success) throw new Error("Nora returned an incompatible response for apps");
      if (!reply.data.ok) throw new Error(reply.data.message);
      return reply.data.value;
    },
    onChanged: (listener) => subscribeToIpcEvent<AppSummary[]>(appsChangedChannel, listener),
    onData: (listener) => subscribeToIpcEvent<AppRenderData>(appsDataChannel, listener),
    onBuildStep: (listener) => subscribeToIpcEvent<AppBuildStep>(appsBuildingChannel, listener)
  };
}
