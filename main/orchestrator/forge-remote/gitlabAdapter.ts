import type {
  ForgeAddCommentPayload,
  ForgeCreatePullRequestPayload,
  ForgeOverview,
  ForgeRepoSummary,
  ForgeRequestOptions,
  ForgeWorkItemAction,
  ForgeWorkItemComment,
  ForgeWorkItemDetail,
  ForgeWorkItemFileChange,
  ForgeWorkItemKind,
  ForgeWorkItemSummary,
  ForgeWorkflowRunDetail,
  ForgeWorkflowRunSummary
} from "@shared/appTypes";
import { limitForgeDiffForTransport } from "@shared/forgeDiff";
import { randomUUID } from "node:crypto";
import type { CountDiffLinesFn, ForgeProviderRemoteAdapter } from "../../types/forgeRemote.types";
import { getJsonArray, getJsonObject, getNumber, getString, type JsonObject } from "../../jsonValue";
import { normalizeGitlabCommentBody } from "../forgeCommentFormatting";
import { normalizeInlineCommentTarget, validateCommentBody, validatePullRequestInput } from "./common";

function buildGitlabHeaders(options: ForgeRequestOptions, includeContentType = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  if (options.gitlabToken) {
    headers["PRIVATE-TOKEN"] = options.gitlabToken;
  }
  return headers;
}

function buildGitlabProjectBaseUrl(repo: ForgeRepoSummary): string {
  return `https://${repo.host}/api/v4/projects/${encodeURIComponent(repo.fullName)}`;
}

export function createGitlabForgeRemoteAdapter(countDiffLines: CountDiffLinesFn): ForgeProviderRemoteAdapter {
  function mapMergeRequest(item: JsonObject): ForgeWorkItemSummary {
    const author = getJsonObject(item.author);
    const references = getJsonObject(item.references);
    const fullReference = getString(references?.full);
    const sourceRepository = fullReference ? fullReference.split("!")[0] ?? null : null;
    return {
      id: `gitlab-mr-${getNumber(item.iid) ?? 0}`,
      number: getNumber(item.iid) ?? 0,
      title: getString(item.title) ?? "",
      state: getString(item.state) ?? "",
      author: getString(author?.username),
      sourceRepository,
      sourceBranch: getString(item.source_branch),
      targetBranch: getString(item.target_branch),
      updatedAt: getString(item.updated_at) ?? "",
      webUrl: getString(item.web_url) ?? ""
    };
  }

  function mapIssue(item: JsonObject): ForgeWorkItemSummary {
    const author = getJsonObject(item.author);
    const references = getJsonObject(item.references);
    const fullReference = getString(references?.full);
    const sourceRepository = fullReference ? fullReference.split("#")[0] ?? null : null;
    return {
      id: `gitlab-issue-${getNumber(item.iid) ?? 0}`,
      number: getNumber(item.iid) ?? 0,
      title: getString(item.title) ?? "",
      state: getString(item.state) ?? "",
      author: getString(author?.username),
      sourceRepository,
      sourceBranch: null,
      targetBranch: null,
      updatedAt: getString(item.updated_at) ?? "",
      webUrl: getString(item.web_url) ?? ""
    };
  }

  function mapComment(item: JsonObject): ForgeWorkItemComment {
    const author = getJsonObject(item.author);
    const body = getString(item.body) ?? "";
    return {
      id: `gitlab-note-${getNumber(item.id) ?? 0}`,
      author: getString(author?.username),
      authorAvatarUrl: getString(author?.avatar_url),
      body: normalizeGitlabCommentBody(body),
      createdAt: getString(item.created_at) ?? getString(item.updated_at) ?? new Date().toISOString(),
      path: null,
      oldLine: null,
      newLine: null
    };
  }

  function mapDiscussionComments(discussion: JsonObject): ForgeWorkItemComment[] {
    const threadId = getString(discussion.id) ?? `gitlab-discussion-${randomUUID()}`;
    const notes = getJsonArray(discussion.notes)
      .map((note) => getJsonObject(note))
      .filter((note): note is JsonObject => !!note);

    return notes.map((note) => {
      const author = getJsonObject(note.author);
      const position = getJsonObject(note.position);
      const path = getString(position?.new_path) ?? getString(position?.old_path);
      const body = getString(note.body) ?? "";
      return {
        id: `gitlab-discussion-note-${getNumber(note.id) ?? randomUUID()}`,
        author: getString(author?.username),
        authorAvatarUrl: getString(author?.avatar_url),
        body: normalizeGitlabCommentBody(body),
        createdAt: getString(note.created_at) ?? getString(note.updated_at) ?? new Date().toISOString(),
        threadId,
        path: path ?? null,
        oldLine: getNumber(position?.old_line),
        newLine: getNumber(position?.new_line)
      };
    });
  }

  function mapMergeRequestFileChange(item: JsonObject): ForgeWorkItemFileChange {
    const diff = getString(item.diff) ?? "";
    const oldPath = getString(item.old_path);
    const newPath = getString(item.new_path);
    return {
      id: `gitlab-mr-file-${newPath ?? oldPath ?? randomUUID()}`,
      path: newPath ?? oldPath ?? "",
      previousPath: oldPath && newPath && oldPath !== newPath ? oldPath : null,
      additions: countDiffLines(diff, "+"),
      deletions: countDiffLines(diff, "-"),
      diff: limitForgeDiffForTransport(diff)
    };
  }

  function mapPipeline(item: JsonObject): ForgeWorkflowRunSummary {
    const pipelineId = getNumber(item.id) ?? 0;
    const pipelineIid = getNumber(item.iid);
    return {
      id: `gitlab-pipeline-${pipelineId}`,
      name: pipelineIid ? `Pipeline #${pipelineIid}` : `Pipeline #${pipelineId}`,
      status: getString(item.status) ?? "unknown",
      conclusion: null,
      branch: getString(item.ref),
      event: getString(item.source),
      updatedAt: getString(item.updated_at) ?? getString(item.created_at) ?? new Date().toISOString(),
      webUrl: getString(item.web_url) ?? ""
    };
  }

  async function fetchOverviewForRepo(repo: ForgeRepoSummary, options: ForgeRequestOptions): Promise<ForgeOverview> {
    const baseUrl = buildGitlabProjectBaseUrl(repo);
    const headers = buildGitlabHeaders(options);
    const [mergeRequestsResponse, issuesResponse, pipelinesResponse] = await Promise.all([
      fetch(`${baseUrl}/merge_requests?state=opened&per_page=20`, { headers }),
      fetch(`${baseUrl}/issues?state=opened&per_page=20`, { headers }),
      fetch(`${baseUrl}/pipelines?per_page=10&order_by=updated_at&sort=desc`, { headers })
    ]);

    if (!mergeRequestsResponse.ok || !issuesResponse.ok || !pipelinesResponse.ok) {
      const detail = !mergeRequestsResponse.ok
        ? await mergeRequestsResponse.text()
        : !issuesResponse.ok
          ? await issuesResponse.text()
          : await pipelinesResponse.text();
      throw new Error(
        `GitLab request failed: ${detail || mergeRequestsResponse.statusText || issuesResponse.statusText || pipelinesResponse.statusText}`
      );
    }

    const [mergeRequestsPayload, issuesPayload, pipelinesPayload] = await Promise.all([
      mergeRequestsResponse.json(),
      issuesResponse.json(),
      pipelinesResponse.json()
    ]);
    const mergeRequests = getJsonArray(mergeRequestsPayload)
      .map((item) => getJsonObject(item))
      .filter((item): item is JsonObject => !!item);
    const issues = getJsonArray(issuesPayload)
      .map((item) => getJsonObject(item))
      .filter((item): item is JsonObject => !!item);
    const pipelines = getJsonArray(pipelinesPayload)
      .map((item) => getJsonObject(item))
      .filter((item): item is JsonObject => !!item);

    return {
      repo,
      pullRequests: mergeRequests.map(mapMergeRequest),
      issues: issues.map(mapIssue),
      workflowRuns: pipelines.map(mapPipeline),
      gitlabUserMergeRequests: [],
      gitlabUserMergeRequestsErrorMessage: null,
      errorMessage: null
    };
  }

  async function fetchUserMergeRequests(host: string, options: ForgeRequestOptions): Promise<ForgeWorkItemSummary[]> {
    const gitlabToken = options.gitlabToken?.trim() ?? "";
    if (!gitlabToken) {
      return [];
    }

    const normalizedHost = host.trim().replace(/^https?:\/\//i, "").split("/")[0]?.trim();
    if (!normalizedHost) {
      throw new Error("GitLab host is not configured.");
    }

    const response = await fetch(
      `https://${normalizedHost}/api/v4/merge_requests?scope=created_by_me&state=opened&per_page=50&order_by=updated_at&sort=desc`,
      { headers: { "PRIVATE-TOKEN": gitlabToken } }
    );
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`GitLab request failed: ${detail || response.statusText}`);
    }

    const payload = await response.json();
    const mergeRequests = getJsonArray(payload)
      .map((item) => getJsonObject(item))
      .filter((item): item is JsonObject => !!item);
    return mergeRequests.map((item) => {
      const projectId = getNumber(item.project_id) ?? 0;
      const iid = getNumber(item.iid) ?? 0;
      return {
        ...mapMergeRequest(item),
        id: `gitlab-global-mr-${projectId}-${iid}`
      };
    });
  }

  async function fetchWorkItemDetail(
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    options: ForgeRequestOptions
  ): Promise<ForgeWorkItemDetail> {
    const headers = buildGitlabHeaders(options);
    const baseUrl = buildGitlabProjectBaseUrl(repo);
    const itemPath = kind === "pull_request" ? "merge_requests" : "issues";
    const fileChangesResponsePromise = kind === "pull_request"
      ? fetch(`${baseUrl}/merge_requests/${number}/changes`, { headers })
      : Promise.resolve<Response | null>(null);
    const discussionsResponsePromise = kind === "pull_request"
      ? fetch(`${baseUrl}/merge_requests/${number}/discussions?per_page=100`, { headers })
      : Promise.resolve<Response | null>(null);
    const [itemResponse, commentsResponse, fileChangesResponse] = await Promise.all([
      fetch(`${baseUrl}/${itemPath}/${number}`, { headers }),
      fetch(`${baseUrl}/${itemPath}/${number}/notes?per_page=50`, { headers }),
      fileChangesResponsePromise
    ]);
    const discussionsResponse = await discussionsResponsePromise;

    if (
      !itemResponse.ok ||
      !commentsResponse.ok ||
      (fileChangesResponse && !fileChangesResponse.ok) ||
      (discussionsResponse && !discussionsResponse.ok)
    ) {
      const detail = !itemResponse.ok ? await itemResponse.text() : await commentsResponse.text();
      if (fileChangesResponse && !fileChangesResponse.ok) {
        throw new Error(`GitLab request failed: ${await fileChangesResponse.text() || fileChangesResponse.statusText}`);
      }
      if (discussionsResponse && !discussionsResponse.ok) {
        throw new Error(`GitLab request failed: ${await discussionsResponse.text() || discussionsResponse.statusText}`);
      }
      throw new Error(`GitLab request failed: ${detail || itemResponse.statusText || commentsResponse.statusText}`);
    }

    const [itemPayload, commentsPayload, fileChangesPayload, discussionsPayload] = await Promise.all([
      itemResponse.json(),
      commentsResponse.json(),
      fileChangesResponse ? fileChangesResponse.json() : Promise.resolve({}),
      discussionsResponse ? discussionsResponse.json() : Promise.resolve([])
    ]);
    const item = getJsonObject(itemPayload) ?? {};
    const comments = getJsonArray(commentsPayload);
    const discussions = getJsonArray(discussionsPayload)
      .map((entry) => getJsonObject(entry))
      .filter((entry): entry is JsonObject => !!entry);
    const fileChanges = getJsonArray(getJsonObject(fileChangesPayload)?.changes)
      .map((change) => getJsonObject(change))
      .filter((change): change is JsonObject => !!change)
      .map(mapMergeRequestFileChange);
    const labels = getJsonArray(item.labels)
      .map((label) => getString(label))
      .filter((label): label is string => !!label);

    return {
      kind,
      item: kind === "pull_request" ? mapMergeRequest(item) : mapIssue(item),
      body: getString(item.description) ?? "",
      labels,
      changes: kind === "pull_request" ? fileChanges : [],
      comments: kind === "pull_request"
        ? discussions.flatMap((discussion) => mapDiscussionComments(discussion))
        : comments.map((comment) => mapComment(getJsonObject(comment) ?? {})),
      capabilities: {
        supportsInlineComments: kind === "pull_request"
      },
      canMerge: kind === "pull_request" && getString(item.state) === "opened",
      canClose: ["opened", "open", "reopened"].includes(getString(item.state) ?? ""),
      canReopen: getString(item.state) === "closed"
    };
  }

  async function fetchWorkflowRunDetailForRepo(
    repo: ForgeRepoSummary,
    runId: number,
    options: ForgeRequestOptions
  ): Promise<ForgeWorkflowRunDetail> {
    const baseUrl = buildGitlabProjectBaseUrl(repo);
    const headers = buildGitlabHeaders(options);
    const [pipelineResponse, jobsResponse] = await Promise.all([
      fetch(`${baseUrl}/pipelines/${runId}`, { headers }),
      fetch(`${baseUrl}/pipelines/${runId}/jobs?include_retried=true&per_page=100`, { headers })
    ]);

    if (!pipelineResponse.ok || !jobsResponse.ok) {
      const detail = !pipelineResponse.ok ? await pipelineResponse.text() : await jobsResponse.text();
      throw new Error(`GitLab request failed: ${detail || pipelineResponse.statusText || jobsResponse.statusText}`);
    }

    const pipelinePayload = getJsonObject(await pipelineResponse.json()) ?? {};
    const jobsPayload = getJsonArray(await jobsResponse.json())
      .map((item) => getJsonObject(item))
      .filter((item): item is JsonObject => !!item);
    const jobs = jobsPayload.map((job) => ({
      id: String(getNumber(job.id) ?? randomUUID()),
      name: getString(job.name) ?? getString(job.stage) ?? "Unnamed job",
      status: getString(job.status) ?? "unknown",
      conclusion: null,
      startedAt: getString(job.started_at),
      completedAt: getString(job.finished_at),
      webUrl: getString(job.web_url),
      steps: []
    }));
    const pipelineIid = getNumber(pipelinePayload.iid);

    return {
      id: getNumber(pipelinePayload.id) ?? runId,
      name: pipelineIid ? `Pipeline #${pipelineIid}` : `Pipeline #${runId}`,
      status: getString(pipelinePayload.status) ?? "unknown",
      conclusion: null,
      branch: getString(pipelinePayload.ref),
      event: getString(pipelinePayload.source),
      createdAt: getString(pipelinePayload.created_at) ?? new Date().toISOString(),
      updatedAt: getString(pipelinePayload.updated_at) ?? getString(pipelinePayload.created_at) ?? new Date().toISOString(),
      webUrl: getString(pipelinePayload.web_url) ?? "",
      jobs
    };
  }

  async function performWorkItemActionForRepo(
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    action: ForgeWorkItemAction,
    options: ForgeRequestOptions
  ): Promise<void> {
    const headers = buildGitlabHeaders(options, true);
    const baseUrl = buildGitlabProjectBaseUrl(repo);
    let response: Response;
    if (action === "merge") {
      if (kind !== "pull_request") {
        throw new Error("Only merge requests can be merged.");
      }
      response = await fetch(`${baseUrl}/merge_requests/${number}/merge`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ merge_when_pipeline_succeeds: false, should_remove_source_branch: false })
      });
    } else {
      const itemPath = kind === "pull_request" ? "merge_requests" : "issues";
      response = await fetch(`${baseUrl}/${itemPath}/${number}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ state_event: action === "close" ? "close" : "reopen" })
      });
    }

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`GitLab request failed: ${detail || response.statusText}`);
    }
  }

  async function addWorkItemCommentForRepo(
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    payload: ForgeAddCommentPayload,
    options: ForgeRequestOptions
  ): Promise<void> {
    const trimmedBody = validateCommentBody(payload.body);
    const headers = buildGitlabHeaders(options, true);
    const baseUrl = buildGitlabProjectBaseUrl(repo);
    const itemPath = kind === "pull_request" ? "merge_requests" : "issues";
    const inlineTarget = payload.inlineTarget ?? null;
    if (kind === "pull_request" && inlineTarget) {
      const target = normalizeInlineCommentTarget(inlineTarget);
      const mrResponse = await fetch(`${baseUrl}/merge_requests/${number}`, { headers });
      if (!mrResponse.ok) {
        const detail = await mrResponse.text();
        throw new Error(`GitLab request failed: ${detail || mrResponse.statusText}`);
      }
      const mrPayload = getJsonObject(await mrResponse.json()) ?? {};
      const diffRefs = getJsonObject(mrPayload.diff_refs);
      const baseSha = getString(diffRefs?.base_sha);
      const headSha = getString(diffRefs?.head_sha);
      const startSha = getString(diffRefs?.start_sha) ?? baseSha;
      if (!baseSha || !headSha || !startSha) {
        throw new Error("GitLab merge request diff refs are unavailable for inline comments.");
      }

      const discussionResponse = await fetch(`${baseUrl}/merge_requests/${number}/discussions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          body: trimmedBody,
          position: {
            position_type: "text",
            base_sha: baseSha,
            start_sha: startSha,
            head_sha: headSha,
            old_path: target.path,
            new_path: target.path,
            old_line: target.hasOldLine ? target.oldLine : null,
            new_line: target.hasNewLine ? target.newLine : null
          }
        })
      });
      if (!discussionResponse.ok) {
        const detail = await discussionResponse.text();
        throw new Error(`GitLab request failed: ${detail || discussionResponse.statusText}`);
      }
      return;
    }

    const response = await fetch(`${baseUrl}/${itemPath}/${number}/notes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ body: trimmedBody })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`GitLab request failed: ${detail || response.statusText}`);
    }
  }

  async function createPullRequestForRepo(
    repo: ForgeRepoSummary,
    sourceBranch: string,
    payload: ForgeCreatePullRequestPayload,
    options: ForgeRequestOptions
  ): Promise<ForgeWorkItemDetail> {
    validatePullRequestInput(sourceBranch, payload);
    const headers = buildGitlabHeaders(options, true);
    const baseUrl = buildGitlabProjectBaseUrl(repo);
    const response = await fetch(`${baseUrl}/merge_requests`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: payload.draft ? `Draft: ${payload.title.trim()}` : payload.title.trim(),
        description: payload.body.trim(),
        source_branch: sourceBranch,
        target_branch: payload.baseBranch.trim()
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`GitLab request failed: ${detail || response.statusText}`);
    }

    const item = getJsonObject(await response.json()) ?? {};
    const number = getNumber(item.iid);
    if (!number) {
      throw new Error("GitLab merge request number is unavailable.");
    }
    return fetchWorkItemDetail(repo, "pull_request", number, options);
  }

  return {
    fetchOverviewForRepo,
    fetchUserMergeRequests,
    fetchBranchPullRequestStatusForRepo: async () => null,
    fetchWorkItemDetail,
    fetchWorkflowRunDetailForRepo,
    performWorkItemActionForRepo,
    addWorkItemCommentForRepo,
    createPullRequestForRepo
  };
}
