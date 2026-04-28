import { getForgeOAuthProviderConfigs, startForgeOAuth } from "@main/forgeOAuth";
import type { MainServices } from "@main/services/mainServices";
import type {
  ForgeAddCommentPayload,
  ForgeCreatePullRequestPayload,
  ForgeOAuthDevicePrompt,
  ForgeRequestOptions,
  ForgeWorkItemAction,
  ForgeWorkItemKind,
  OAuthProvider
} from "@shared/appTypes";
import { ipcMain } from "electron";

interface RegisterForgeIpcDeps {
  services: MainServices;
  notifyForgeOAuthDevicePrompt: (payload: ForgeOAuthDevicePrompt) => void;
}

export function registerForgeIpc({
  services,
  notifyForgeOAuthDevicePrompt
}: RegisterForgeIpcDeps): void {
  ipcMain.handle("app:get-forge-overview", (_event, projectId: string, options: ForgeRequestOptions) =>
    services.forge.getForgeOverview(projectId, options)
  );
  ipcMain.handle("app:get-forge-branch-pull-request-status", (_event, projectId: string, branch: string, options: ForgeRequestOptions) =>
    services.forge.getForgeBranchPullRequestStatus(projectId, branch, options)
  );
  ipcMain.handle(
    "app:get-forge-work-item-detail",
    (_event, projectId: string, kind: ForgeWorkItemKind, number: number, options: ForgeRequestOptions) =>
      services.forge.getForgeWorkItemDetail(projectId, kind, number, options)
  );
  ipcMain.handle(
    "app:add-forge-work-item-comment",
    (_event, projectId: string, kind: ForgeWorkItemKind, number: number, payload: ForgeAddCommentPayload, options: ForgeRequestOptions) =>
      services.forge.addForgeWorkItemComment(projectId, kind, number, payload, options)
  );
  ipcMain.handle(
    "app:create-forge-pull-request",
    (_event, projectId: string, payload: ForgeCreatePullRequestPayload, options: ForgeRequestOptions) =>
      services.forge.createForgePullRequest(projectId, payload, options)
  );
  ipcMain.handle(
    "app:perform-forge-work-item-action",
    (_event, projectId: string, kind: ForgeWorkItemKind, number: number, action: ForgeWorkItemAction, options: ForgeRequestOptions) =>
      services.forge.performForgeWorkItemAction(projectId, kind, number, action, options)
  );
  ipcMain.handle("app:get-forge-oauth-providers", () => getForgeOAuthProviderConfigs());
  ipcMain.handle("app:start-forge-oauth", (_event, provider: OAuthProvider) =>
    startForgeOAuth(provider, notifyForgeOAuthDevicePrompt)
  );
}
