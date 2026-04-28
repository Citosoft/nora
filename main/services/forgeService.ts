import type { ForgeService } from "../types/mainServices.types";

type ForgeServiceDeps = ForgeService;

export function createForgeService(deps: ForgeServiceDeps): ForgeService {
  return {
    getForgeOverview: deps.getForgeOverview,
    getForgeBranchPullRequestStatus: deps.getForgeBranchPullRequestStatus,
    getForgeWorkItemDetail: deps.getForgeWorkItemDetail,
    addForgeWorkItemComment: deps.addForgeWorkItemComment,
    createForgePullRequest: deps.createForgePullRequest,
    performForgeWorkItemAction: deps.performForgeWorkItemAction
  };
}
