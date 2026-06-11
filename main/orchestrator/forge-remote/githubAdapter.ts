import type {
  ForgeAddCommentPayload,
  ForgeBranchPullRequestStatus,
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
import { getBoolean, getJsonArray, getJsonObject, getNumber, getString, type JsonObject } from "../../jsonValue";
import { normalizeInlineCommentTarget, validateCommentBody, validatePullRequestInput } from "./common";

function buildGithubHeaders(options: ForgeRequestOptions, includeContentType = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json"
  };
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  if (options.githubToken) {
    headers.Authorization = `Bearer ${options.githubToken}`;
  }
  return headers;
}

export function createGithubForgeRemoteAdapter(countDiffLines: CountDiffLinesFn): ForgeProviderRemoteAdapter {
  function mapPullRequest(item: JsonObject): ForgeWorkItemSummary {
    const user = getJsonObject(item.user);
    const head = getJsonObject(item.head);
    const base = getJsonObject(item.base);
    return {
      id: `github-pr-${getNumber(item.number) ?? 0}`,
      number: getNumber(item.number) ?? 0,
      title: getString(item.title) ?? "",
      state: getString(item.state) ?? "",
      author: getString(user?.login),
      sourceRepository: null,
      sourceBranch: getString(head?.ref),
      targetBranch: getString(base?.ref),
      updatedAt: getString(item.updated_at) ?? "",
      webUrl: getString(item.html_url) ?? ""
    };
  }

  function mapIssue(item: JsonObject): ForgeWorkItemSummary {
    const user = getJsonObject(item.user);
    return {
      id: `github-issue-${getNumber(item.number) ?? 0}`,
      number: getNumber(item.number) ?? 0,
      title: getString(item.title) ?? "",
      state: getString(item.state) ?? "",
      author: getString(user?.login),
      sourceRepository: null,
      sourceBranch: null,
      targetBranch: null,
      updatedAt: getString(item.updated_at) ?? "",
      webUrl: getString(item.html_url) ?? ""
    };
  }

  function mapIssueComment(item: JsonObject): ForgeWorkItemComment {
    const user = getJsonObject(item.user);
    return {
      id: `github-comment-${getNumber(item.id) ?? 0}`,
      author: getString(user?.login),
      authorAvatarUrl: getString(user?.avatar_url),
      body: getString(item.body) ?? "",
      createdAt: getString(item.created_at) ?? getString(item.updated_at) ?? new Date().toISOString(),
      path: null,
      oldLine: null,
      newLine: null
    };
  }

  function mapReviewComment(item: JsonObject): ForgeWorkItemComment {
    const user = getJsonObject(item.user);
    const side = getString(item.side);
    const line = getNumber(item.line) ?? getNumber(item.original_line);
    const oldLine = side === "LEFT" ? line : null;
    const newLine = side === "RIGHT" || side === null ? line : null;
    return {
      id: `github-review-comment-${getNumber(item.id) ?? 0}`,
      author: getString(user?.login),
      authorAvatarUrl: getString(user?.avatar_url),
      body: getString(item.body) ?? "",
      createdAt: getString(item.created_at) ?? getString(item.updated_at) ?? new Date().toISOString(),
      threadId: String(getNumber(item.pull_request_review_id) ?? getNumber(item.id) ?? randomUUID()),
      path: getString(item.path),
      oldLine,
      newLine
    };
  }

  function mapPullRequestFileChange(item: JsonObject): ForgeWorkItemFileChange {
    const patch = getString(item.patch) ?? "";
    return {
      id: `github-pr-file-${getString(item.sha) ?? getString(item.filename) ?? randomUUID()}`,
      path: getString(item.filename) ?? "",
      previousPath: getString(item.previous_filename),
      additions: getNumber(item.additions) ?? countDiffLines(patch, "+"),
      deletions: getNumber(item.deletions) ?? countDiffLines(patch, "-"),
      diff: limitForgeDiffForTransport(patch)
    };
  }

  function mapWorkflowRun(item: JsonObject): ForgeWorkflowRunSummary {
    return {
      id: `github-workflow-run-${getNumber(item.id) ?? 0}`,
      name: getString(item.display_title) ?? getString(item.name) ?? "Unnamed workflow",
      status: getString(item.status) ?? "unknown",
      conclusion: getString(item.conclusion),
      branch: getString(item.head_branch),
      event: getString(item.event),
      updatedAt: getString(item.updated_at) ?? getString(item.created_at) ?? new Date().toISOString(),
      webUrl: getString(item.html_url) ?? ""
    };
  }

  async function fetchPullRequestHeadSha(
    repo: ForgeRepoSummary,
    number: number,
    headers: Record<string, string>
  ): Promise<string> {
    const response = await fetch(`https://api.github.com/repos/${repo.fullName}/pulls/${number}`, { headers });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`GitHub request failed: ${detail || response.statusText}`);
    }

    const item = getJsonObject(await response.json()) ?? {};
    const head = getJsonObject(item.head);
    const headSha = getString(head?.sha);
    if (!headSha) {
      throw new Error("GitHub pull request head commit is unavailable for inline comments.");
    }
    return headSha;
  }

  async function fetchOverviewForRepo(repo: ForgeRepoSummary, options: ForgeRequestOptions): Promise<ForgeOverview> {
    const headers = buildGithubHeaders(options);
    const [pullsResponse, issuesResponse, workflowRunsResponse] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo.fullName}/pulls?state=open&per_page=20`, { headers }),
      fetch(`https://api.github.com/repos/${repo.fullName}/issues?state=open&per_page=20&sort=updated&direction=desc`, { headers }),
      fetch(`https://api.github.com/repos/${repo.fullName}/actions/runs?per_page=10`, { headers })
    ]);

    if (!pullsResponse.ok || !issuesResponse.ok || !workflowRunsResponse.ok) {
      const detail = !pullsResponse.ok
        ? await pullsResponse.text()
        : !issuesResponse.ok
          ? await issuesResponse.text()
          : await workflowRunsResponse.text();
      throw new Error(
        `GitHub request failed: ${detail || pullsResponse.statusText || issuesResponse.statusText || workflowRunsResponse.statusText}`
      );
    }

    const [pullsPayload, issuesPayload, workflowRunsPayload] = await Promise.all([
      pullsResponse.json(),
      issuesResponse.json(),
      workflowRunsResponse.json()
    ]);
    const pulls = getJsonArray(pullsPayload)
      .map((item) => getJsonObject(item))
      .filter((item): item is JsonObject => !!item);
    const issues = getJsonArray(issuesPayload)
      .map((item) => getJsonObject(item))
      .filter((item): item is JsonObject => !!item);
    const workflowRuns = getJsonArray(getJsonObject(workflowRunsPayload)?.workflow_runs)
      .map((item) => getJsonObject(item))
      .filter((item): item is JsonObject => !!item);

    return {
      repo,
      pullRequests: pulls.map(mapPullRequest),
      issues: issues.filter((item) => !getJsonObject(item.pull_request)).map(mapIssue),
      workflowRuns: workflowRuns.map(mapWorkflowRun),
      gitlabUserMergeRequests: [],
      gitlabUserMergeRequestsErrorMessage: null,
      errorMessage: null
    };
  }

  async function fetchBranchPullRequestStatusForRepo(
    repo: ForgeRepoSummary,
    branch: string,
    options: ForgeRequestOptions
  ): Promise<ForgeBranchPullRequestStatus | null> {
    const normalizedBranch = branch.trim();
    if (!normalizedBranch) {
      return null;
    }

    const headers = buildGithubHeaders(options);
    const branchResponse = await fetch(
      `https://api.github.com/repos/${repo.fullName}/branches/${encodeURIComponent(normalizedBranch)}`,
      { headers }
    );
    const branchExistsOnRemote = branchResponse.ok;
    if (!branchExistsOnRemote) {
      return {
        branch: normalizedBranch,
        branchExistsOnRemote: false,
        state: "no_pull_request",
        label: "No pull request",
        pullRequestNumber: null,
        webUrl: null
      };
    }

    const response = await fetch(
      `https://api.github.com/repos/${repo.fullName}/pulls?state=all&head=${encodeURIComponent(`${repo.owner}:${normalizedBranch}`)}&per_page=20&sort=updated&direction=desc`,
      { headers }
    );
    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const pulls = getJsonArray(payload)
      .map((item) => getJsonObject(item))
      .filter((item): item is JsonObject => !!item);
    const pull = pulls[0] ?? null;
    if (!pull) {
      return {
        branch: normalizedBranch,
        branchExistsOnRemote: true,
        state: "no_pull_request",
        label: "No pull request",
        pullRequestNumber: null,
        webUrl: null
      };
    }

    const state = getString(pull.state) ?? "";
    const isDraft = getBoolean(pull.draft) === true;
    const mergedAt = getString(pull.merged_at);
    const prNumber = getNumber(pull.number);
    const webUrl = getString(pull.html_url) ?? null;
    if (state === "open" && isDraft) {
      return {
        branch: normalizedBranch,
        branchExistsOnRemote: true,
        state: "draft",
        label: "Draft",
        pullRequestNumber: prNumber ?? null,
        webUrl
      };
    }
    if (state === "open") {
      return {
        branch: normalizedBranch,
        branchExistsOnRemote: true,
        state: "open",
        label: "Open",
        pullRequestNumber: prNumber ?? null,
        webUrl
      };
    }
    if (state === "closed" && mergedAt) {
      return {
        branch: normalizedBranch,
        branchExistsOnRemote: true,
        state: "merged",
        label: "Merged",
        pullRequestNumber: prNumber ?? null,
        webUrl
      };
    }
    return {
      branch: normalizedBranch,
      branchExistsOnRemote: true,
      state: "closed",
      label: "Closed",
      pullRequestNumber: prNumber ?? null,
      webUrl
    };
  }

  async function fetchWorkItemDetail(
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    options: ForgeRequestOptions
  ): Promise<ForgeWorkItemDetail> {
    const headers = buildGithubHeaders(options);
    const itemPath = kind === "pull_request" ? "pulls" : "issues";
    const fileChangesResponsePromise = kind === "pull_request"
      ? fetch(`https://api.github.com/repos/${repo.fullName}/pulls/${number}/files?per_page=100`, { headers })
      : Promise.resolve<Response | null>(null);
    const reviewCommentsResponsePromise = kind === "pull_request"
      ? fetch(`https://api.github.com/repos/${repo.fullName}/pulls/${number}/comments?per_page=100`, { headers })
      : Promise.resolve<Response | null>(null);
    const [itemResponse, commentsResponse, fileChangesResponse, reviewCommentsResponse] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo.fullName}/${itemPath}/${number}`, { headers }),
      fetch(`https://api.github.com/repos/${repo.fullName}/issues/${number}/comments?per_page=50`, { headers }),
      fileChangesResponsePromise,
      reviewCommentsResponsePromise
    ]);

    if (
      !itemResponse.ok ||
      !commentsResponse.ok ||
      (fileChangesResponse && !fileChangesResponse.ok) ||
      (reviewCommentsResponse && !reviewCommentsResponse.ok)
    ) {
      const detail = !itemResponse.ok ? await itemResponse.text() : await commentsResponse.text();
      if (fileChangesResponse && !fileChangesResponse.ok) {
        throw new Error(`GitHub request failed: ${await fileChangesResponse.text() || fileChangesResponse.statusText}`);
      }
      if (reviewCommentsResponse && !reviewCommentsResponse.ok) {
        throw new Error(`GitHub request failed: ${await reviewCommentsResponse.text() || reviewCommentsResponse.statusText}`);
      }
      throw new Error(`GitHub request failed: ${detail || itemResponse.statusText || commentsResponse.statusText}`);
    }

    const [itemPayload, commentsPayload, fileChangesPayload, reviewCommentsPayload] = await Promise.all([
      itemResponse.json(),
      commentsResponse.json(),
      fileChangesResponse ? fileChangesResponse.json() : Promise.resolve([]),
      reviewCommentsResponse ? reviewCommentsResponse.json() : Promise.resolve([])
    ]);
    const item = getJsonObject(itemPayload) ?? {};
    const comments = getJsonArray(commentsPayload);
    const reviewComments = getJsonArray(reviewCommentsPayload);
    const fileChanges = getJsonArray(fileChangesPayload)
      .map((change) => getJsonObject(change))
      .filter((change): change is JsonObject => !!change)
      .map(mapPullRequestFileChange);
    const labels = getJsonArray(item.labels)
      .map((label) => getString(getJsonObject(label)?.name))
      .filter((label): label is string => !!label);

    return {
      kind,
      item: kind === "pull_request" ? mapPullRequest(item) : mapIssue(item),
      body: getString(item.body) ?? "",
      labels,
      changes: kind === "pull_request" ? fileChanges : [],
      comments: [
        ...comments.map((comment) => mapIssueComment(getJsonObject(comment) ?? {})),
        ...reviewComments.map((comment) => mapReviewComment(getJsonObject(comment) ?? {}))
      ],
      capabilities: {
        supportsInlineComments: kind === "pull_request"
      },
      canMerge: kind === "pull_request" && getString(item.state) === "open" && getBoolean(item.merged) !== true,
      canClose: getString(item.state) === "open",
      canReopen: getString(item.state) === "closed"
    };
  }

  async function fetchWorkflowRunDetailForRepo(
    repo: ForgeRepoSummary,
    runId: number,
    options: ForgeRequestOptions
  ): Promise<ForgeWorkflowRunDetail> {
    const headers = buildGithubHeaders(options);
    const [runResponse, jobsResponse] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo.fullName}/actions/runs/${runId}`, { headers }),
      fetch(`https://api.github.com/repos/${repo.fullName}/actions/runs/${runId}/jobs?per_page=100`, { headers })
    ]);

    if (!runResponse.ok || !jobsResponse.ok) {
      const detail = !runResponse.ok ? await runResponse.text() : await jobsResponse.text();
      throw new Error(`GitHub request failed: ${detail || runResponse.statusText || jobsResponse.statusText}`);
    }

    const runPayload = getJsonObject(await runResponse.json()) ?? {};
    const jobsPayload = getJsonObject(await jobsResponse.json()) ?? {};
    const jobs = getJsonArray(jobsPayload.jobs)
      .map((item) => getJsonObject(item))
      .filter((item): item is JsonObject => !!item)
      .map((job) => ({
        id: String(getNumber(job.id) ?? randomUUID()),
        name: getString(job.name) ?? "Unnamed job",
        status: getString(job.status) ?? "unknown",
        conclusion: getString(job.conclusion),
        startedAt: getString(job.started_at),
        completedAt: getString(job.completed_at),
        webUrl: getString(job.html_url),
        steps: getJsonArray(job.steps)
          .map((item) => getJsonObject(item))
          .filter((item): item is JsonObject => !!item)
          .map((step) => ({
            id: String(getNumber(step.number) ?? randomUUID()),
            name: getString(step.name) ?? "Unnamed step",
            number: getNumber(step.number) ?? 0,
            status: getString(step.status) ?? "unknown",
            conclusion: getString(step.conclusion),
            startedAt: getString(step.started_at),
            completedAt: getString(step.completed_at)
          }))
      }));

    return {
      id: getNumber(runPayload.id) ?? runId,
      name: getString(runPayload.display_title) ?? getString(runPayload.name) ?? `Action #${runId}`,
      status: getString(runPayload.status) ?? "unknown",
      conclusion: getString(runPayload.conclusion),
      branch: getString(runPayload.head_branch),
      event: getString(runPayload.event),
      createdAt: getString(runPayload.created_at) ?? new Date().toISOString(),
      updatedAt: getString(runPayload.updated_at) ?? getString(runPayload.created_at) ?? new Date().toISOString(),
      webUrl: getString(runPayload.html_url) ?? "",
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
    const headers = buildGithubHeaders(options, true);
    let response: Response;
    if (action === "merge") {
      if (kind !== "pull_request") {
        throw new Error("Only pull requests can be merged.");
      }
      response = await fetch(`https://api.github.com/repos/${repo.fullName}/pulls/${number}/merge`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ merge_method: "merge" })
      });
    } else {
      response = await fetch(`https://api.github.com/repos/${repo.fullName}/issues/${number}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ state: action === "close" ? "closed" : "open" })
      });
    }

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`GitHub request failed: ${detail || response.statusText}`);
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
    const headers = buildGithubHeaders(options, true);

    const inlineTarget = payload.inlineTarget ?? null;
    if (kind === "pull_request" && inlineTarget) {
      const target = normalizeInlineCommentTarget(inlineTarget);
      const commitId = await fetchPullRequestHeadSha(repo, number, headers);
      const response = await fetch(`https://api.github.com/repos/${repo.fullName}/pulls/${number}/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          body: trimmedBody,
          commit_id: commitId,
          path: target.path,
          side: target.hasNewLine ? "RIGHT" : "LEFT",
          line: target.hasNewLine ? target.newLine : target.oldLine
        })
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`GitHub request failed: ${detail || response.statusText}`);
      }
      return;
    }

    const response = await fetch(`https://api.github.com/repos/${repo.fullName}/issues/${number}/comments`, {
      method: "POST",
      headers,
      body: JSON.stringify({ body: trimmedBody })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`GitHub request failed: ${detail || response.statusText}`);
    }
  }

  async function createPullRequestForRepo(
    repo: ForgeRepoSummary,
    sourceBranch: string,
    payload: ForgeCreatePullRequestPayload,
    options: ForgeRequestOptions
  ): Promise<ForgeWorkItemDetail> {
    validatePullRequestInput(sourceBranch, payload);
    const headers = buildGithubHeaders(options, true);
    const response = await fetch(`https://api.github.com/repos/${repo.fullName}/pulls`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: payload.title.trim(),
        body: payload.body.trim(),
        head: sourceBranch,
        base: payload.baseBranch.trim(),
        draft: payload.draft === true
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`GitHub request failed: ${detail || response.statusText}`);
    }

    const item = getJsonObject(await response.json()) ?? {};
    const number = getNumber(item.number);
    if (!number) {
      throw new Error("GitHub pull request number is unavailable.");
    }
    return fetchWorkItemDetail(repo, "pull_request", number, options);
  }

  return {
    fetchOverviewForRepo,
    fetchUserMergeRequests: async () => [],
    fetchBranchPullRequestStatusForRepo,
    fetchWorkItemDetail,
    fetchWorkflowRunDetailForRepo,
    performWorkItemActionForRepo,
    addWorkItemCommentForRepo,
    createPullRequestForRepo
  };
}
