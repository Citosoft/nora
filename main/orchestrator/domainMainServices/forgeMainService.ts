import type {
  ForgeAddCommentPayload,
  ForgeCreatePullRequestPayload,
  ForgeRequestOptions,
  ForgeWorkItemAction,
  ForgeWorkItemKind
} from "@shared/appTypes";
import type { ForgeHelpers } from "../../types/orchestratorForge.types";
import type { ForgeService } from "../../types/mainServices.types";

export class ForgeMainService implements ForgeService {
  constructor(private readonly helpers: ForgeHelpers) {}

  getForgeOverview = (projectId: string, options: ForgeRequestOptions) =>
    this.helpers.getForgeOverview(projectId, options);

  getForgeBranchPullRequestStatus = (projectId: string, branch: string, options: ForgeRequestOptions) =>
    this.helpers.getForgeBranchPullRequestStatus(projectId, branch, options);

  getForgeWorkItemDetail = (projectId: string, kind: ForgeWorkItemKind, number: number, options: ForgeRequestOptions) =>
    this.helpers.getForgeWorkItemDetail(projectId, kind, number, options);

  addForgeWorkItemComment = (
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    payload: ForgeAddCommentPayload,
    options: ForgeRequestOptions
  ) => this.helpers.addForgeWorkItemComment(projectId, kind, number, payload, options);

  createForgePullRequest = (
    projectId: string,
    payload: ForgeCreatePullRequestPayload,
    options: ForgeRequestOptions
  ) => this.helpers.createForgePullRequest(projectId, payload, options);

  performForgeWorkItemAction = (
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    action: ForgeWorkItemAction,
    options: ForgeRequestOptions
  ) => this.helpers.performForgeWorkItemAction(projectId, kind, number, action, options);
}
