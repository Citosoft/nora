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
  ForgeWorkflowRunSummary,
  ForgeWorkflowRunDetail
} from "@shared/appTypes";
import { randomUUID } from "node:crypto";
import { getBoolean, getJsonArray, getJsonObject, getNumber, getString, type JsonObject } from "../jsonValue";
import { normalizeGitlabCommentBody } from "./forgeCommentFormatting";

type CountDiffLinesFn = (diff: string, prefix: string) => number;

export function createForgeRemoteOps(countDiffLines: CountDiffLinesFn) {
  function mapGithubPullRequest(item: JsonObject): ForgeWorkItemSummary {
    const user = getJsonObject(item.user);
    return {
      id: `github-pr-${getNumber(item.number) ?? 0}`,
      number: getNumber(item.number) ?? 0,
      title: getString(item.title) ?? "",
      state: getString(item.state) ?? "",
      author: getString(user?.login),
      sourceRepository: null,
      updatedAt: getString(item.updated_at) ?? "",
      webUrl: getString(item.html_url) ?? ""
    };
  }

  function mapGithubIssue(item: JsonObject): ForgeWorkItemSummary {
    const user = getJsonObject(item.user);
    return {
      id: `github-issue-${getNumber(item.number) ?? 0}`,
      number: getNumber(item.number) ?? 0,
      title: getString(item.title) ?? "",
      state: getString(item.state) ?? "",
      author: getString(user?.login),
      sourceRepository: null,
      updatedAt: getString(item.updated_at) ?? "",
      webUrl: getString(item.html_url) ?? ""
    };
  }

  function mapGitlabMergeRequest(item: JsonObject): ForgeWorkItemSummary {
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
      updatedAt: getString(item.updated_at) ?? "",
      webUrl: getString(item.web_url) ?? ""
    };
  }

  function mapGitlabIssue(item: JsonObject): ForgeWorkItemSummary {
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
      updatedAt: getString(item.updated_at) ?? "",
      webUrl: getString(item.web_url) ?? ""
    };
  }

  function mapGithubComment(item: JsonObject): ForgeWorkItemComment {
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

  function mapGitlabComment(item: JsonObject): ForgeWorkItemComment {
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

  function mapGitlabDiscussionComments(discussion: JsonObject): ForgeWorkItemComment[] {
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
        path: path ?? null,
        oldLine: getNumber(position?.old_line),
        newLine: getNumber(position?.new_line)
      };
    });
  }

  function mapGithubPullRequestFileChange(item: JsonObject): ForgeWorkItemFileChange {
    const patch = getString(item.patch) ?? "";
    return {
      id: `github-pr-file-${getString(item.sha) ?? getString(item.filename) ?? randomUUID()}`,
      path: getString(item.filename) ?? "",
      previousPath: getString(item.previous_filename),
      additions: getNumber(item.additions) ?? countDiffLines(patch, "+"),
      deletions: getNumber(item.deletions) ?? countDiffLines(patch, "-"),
      diff: patch
    };
  }

  function mapGitlabMergeRequestFileChange(item: JsonObject): ForgeWorkItemFileChange {
    const diff = getString(item.diff) ?? "";
    const oldPath = getString(item.old_path);
    const newPath = getString(item.new_path);
    return {
      id: `gitlab-mr-file-${newPath ?? oldPath ?? randomUUID()}`,
      path: newPath ?? oldPath ?? "",
      previousPath: oldPath && newPath && oldPath !== newPath ? oldPath : null,
      additions: countDiffLines(diff, "+"),
      deletions: countDiffLines(diff, "-"),
      diff
    };
  }

  function mapGithubWorkflowRun(item: JsonObject): ForgeWorkflowRunSummary {
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

  async function fetchForgeWorkflowRunDetailForRepo(
    repo: ForgeRepoSummary,
    runId: number,
    options: ForgeRequestOptions
  ): Promise<ForgeWorkflowRunDetail> {
    if (repo.provider !== "github") {
      throw new Error("Workflow run details are only available for GitHub repositories.");
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json"
    };
    if (options.githubToken) {
      headers.Authorization = `Bearer ${options.githubToken}`;
    }

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

  async function fetchForgeOverviewForRepo(
    repo: ForgeRepoSummary,
    options: ForgeRequestOptions
  ): Promise<ForgeOverview> {
    if (repo.provider === "github") {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json"
      };
      if (options.githubToken) {
        headers.Authorization = `Bearer ${options.githubToken}`;
      }

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
        pullRequests: pulls.map(mapGithubPullRequest),
        issues: issues.filter((item) => !getJsonObject(item.pull_request)).map(mapGithubIssue),
        workflowRuns: workflowRuns.map(mapGithubWorkflowRun),
        gitlabUserMergeRequests: [],
        gitlabUserMergeRequestsErrorMessage: null,
        errorMessage: null
      };
    }

    const baseUrl = `https://${repo.host}/api/v4/projects/${encodeURIComponent(repo.fullName)}`;
    const headers: Record<string, string> = {};
    if (options.gitlabToken) {
      headers["PRIVATE-TOKEN"] = options.gitlabToken;
    }

    const [mergeRequestsResponse, issuesResponse] = await Promise.all([
      fetch(`${baseUrl}/merge_requests?state=opened&per_page=20`, { headers }),
      fetch(`${baseUrl}/issues?state=opened&per_page=20`, { headers })
    ]);

    if (!mergeRequestsResponse.ok || !issuesResponse.ok) {
      const detail = !mergeRequestsResponse.ok ? await mergeRequestsResponse.text() : await issuesResponse.text();
      throw new Error(`GitLab request failed: ${detail || mergeRequestsResponse.statusText || issuesResponse.statusText}`);
    }

    const [mergeRequestsPayload, issuesPayload] = await Promise.all([mergeRequestsResponse.json(), issuesResponse.json()]);
    const mergeRequests = getJsonArray(mergeRequestsPayload)
      .map((item) => getJsonObject(item))
      .filter((item): item is JsonObject => !!item);
    const issues = getJsonArray(issuesPayload)
      .map((item) => getJsonObject(item))
      .filter((item): item is JsonObject => !!item);

    return {
      repo,
      pullRequests: mergeRequests.map(mapGitlabMergeRequest),
      issues: issues.map(mapGitlabIssue),
      workflowRuns: [],
      gitlabUserMergeRequests: [],
      gitlabUserMergeRequestsErrorMessage: null,
      errorMessage: null
    };
  }

  async function fetchGitlabUserMergeRequests(
    host: string,
    options: ForgeRequestOptions
  ): Promise<ForgeWorkItemSummary[]> {
    const gitlabToken = options.gitlabToken?.trim() ?? "";
    if (!gitlabToken) {
      return [];
    }

    const normalizedHost = host.trim().replace(/^https?:\/\//i, "").split("/")[0]?.trim();
    if (!normalizedHost) {
      throw new Error("GitLab host is not configured.");
    }

    const headers: Record<string, string> = {
      "PRIVATE-TOKEN": gitlabToken
    };
    const response = await fetch(
      `https://${normalizedHost}/api/v4/merge_requests?scope=created_by_me&state=opened&per_page=50&order_by=updated_at&sort=desc`,
      { headers }
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
        ...mapGitlabMergeRequest(item),
        id: `gitlab-global-mr-${projectId}-${iid}`
      };
    });
  }

  async function fetchForgeBranchPullRequestStatusForRepo(
    repo: ForgeRepoSummary,
    branch: string,
    options: ForgeRequestOptions
  ): Promise<ForgeBranchPullRequestStatus | null> {
    const normalizedBranch = branch.trim();
    if (!normalizedBranch || repo.provider !== "github") {
      return null;
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json"
    };
    if (options.githubToken) {
      headers.Authorization = `Bearer ${options.githubToken}`;
    }

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

  async function fetchForgeWorkItemDetail(
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    options: ForgeRequestOptions
  ): Promise<ForgeWorkItemDetail> {
    if (repo.provider === "github") {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json"
      };
      if (options.githubToken) {
        headers.Authorization = `Bearer ${options.githubToken}`;
      }

      const itemPath = kind === "pull_request" ? "pulls" : "issues";
      const fileChangesResponsePromise = kind === "pull_request"
        ? fetch(`https://api.github.com/repos/${repo.fullName}/pulls/${number}/files?per_page=100`, { headers })
        : Promise.resolve<Response | null>(null);
      const [itemResponse, commentsResponse, fileChangesResponse] = await Promise.all([
        fetch(`https://api.github.com/repos/${repo.fullName}/${itemPath}/${number}`, { headers }),
        fetch(`https://api.github.com/repos/${repo.fullName}/issues/${number}/comments?per_page=50`, { headers }),
        fileChangesResponsePromise
      ]);

      if (!itemResponse.ok || !commentsResponse.ok || (fileChangesResponse && !fileChangesResponse.ok)) {
        const detail = !itemResponse.ok ? await itemResponse.text() : await commentsResponse.text();
        if (fileChangesResponse && !fileChangesResponse.ok) {
          throw new Error(`GitHub request failed: ${await fileChangesResponse.text() || fileChangesResponse.statusText}`);
        }
        throw new Error(`GitHub request failed: ${detail || itemResponse.statusText || commentsResponse.statusText}`);
      }

      const [itemPayload, commentsPayload, fileChangesPayload] = await Promise.all([
        itemResponse.json(),
        commentsResponse.json(),
        fileChangesResponse ? fileChangesResponse.json() : Promise.resolve([])
      ]);
      const item = getJsonObject(itemPayload) ?? {};
      const comments = getJsonArray(commentsPayload);
      const fileChanges = getJsonArray(fileChangesPayload)
        .map((change) => getJsonObject(change))
        .filter((change): change is JsonObject => !!change)
        .map(mapGithubPullRequestFileChange);
      const labels = getJsonArray(item.labels)
        .map((label) => getString(getJsonObject(label)?.name))
        .filter((label): label is string => !!label);

      return {
        kind,
        item: kind === "pull_request" ? mapGithubPullRequest(item) : mapGithubIssue(item),
        body: getString(item.body) ?? "",
        labels,
        changes: kind === "pull_request" ? fileChanges : [],
        comments: comments.map((comment) => mapGithubComment(getJsonObject(comment) ?? {})),
        capabilities: {
          supportsInlineComments: false
        },
        canMerge: kind === "pull_request" && getString(item.state) === "open" && getBoolean(item.merged) !== true,
        canClose: getString(item.state) === "open",
        canReopen: getString(item.state) === "closed"
      };
    }

    const headers: Record<string, string> = {};
    if (options.gitlabToken) {
      headers["PRIVATE-TOKEN"] = options.gitlabToken;
    }
    const baseUrl = `https://${repo.host}/api/v4/projects/${encodeURIComponent(repo.fullName)}`;
    const itemPath = kind === "pull_request" ? "merge_requests" : "issues";
    const commentsPath = "notes";
    const fileChangesResponsePromise = kind === "pull_request"
      ? fetch(`${baseUrl}/merge_requests/${number}/changes`, { headers })
      : Promise.resolve<Response | null>(null);
    const discussionsResponsePromise = kind === "pull_request"
      ? fetch(`${baseUrl}/merge_requests/${number}/discussions?per_page=100`, { headers })
      : Promise.resolve<Response | null>(null);
    const [itemResponse, commentsResponse, fileChangesResponse] = await Promise.all([
      fetch(`${baseUrl}/${itemPath}/${number}`, { headers }),
      fetch(`${baseUrl}/${itemPath}/${number}/${commentsPath}?per_page=50`, { headers }),
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
      .map(mapGitlabMergeRequestFileChange);
    const labels = getJsonArray(item.labels)
      .map((label) => getString(label))
      .filter((label): label is string => !!label);

    return {
      kind,
      item: kind === "pull_request" ? mapGitlabMergeRequest(item) : mapGitlabIssue(item),
      body: getString(item.description) ?? "",
      labels,
      changes: kind === "pull_request" ? fileChanges : [],
      comments: kind === "pull_request"
        ? discussions.flatMap((discussion) => mapGitlabDiscussionComments(discussion))
        : comments.map((comment) => mapGitlabComment(getJsonObject(comment) ?? {})),
      capabilities: {
        supportsInlineComments: kind === "pull_request"
      },
      canMerge: kind === "pull_request" && getString(item.state) === "opened",
      canClose: ["opened", "open", "reopened"].includes(getString(item.state) ?? ""),
      canReopen: getString(item.state) === "closed"
    };
  }

  async function performForgeWorkItemActionForRepo(
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    action: ForgeWorkItemAction,
    options: ForgeRequestOptions
  ): Promise<void> {
    if (repo.provider === "github") {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      };
      if (options.githubToken) {
        headers.Authorization = `Bearer ${options.githubToken}`;
      }

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
      return;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (options.gitlabToken) {
      headers["PRIVATE-TOKEN"] = options.gitlabToken;
    }

    const baseUrl = `https://${repo.host}/api/v4/projects/${encodeURIComponent(repo.fullName)}`;
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

  async function addForgeWorkItemCommentForRepo(
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    payload: ForgeAddCommentPayload,
    options: ForgeRequestOptions
  ): Promise<void> {
    const trimmedBody = payload.body.trim();
    if (!trimmedBody) {
      throw new Error("Comment body cannot be empty.");
    }

    if (repo.provider === "github") {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      };
      if (options.githubToken) {
        headers.Authorization = `Bearer ${options.githubToken}`;
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
      return;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (options.gitlabToken) {
      headers["PRIVATE-TOKEN"] = options.gitlabToken;
    }

    const itemPath = kind === "pull_request" ? "merge_requests" : "issues";
    const baseUrl = `https://${repo.host}/api/v4/projects/${encodeURIComponent(repo.fullName)}`;
    const inlineTarget = payload.inlineTarget ?? null;
    if (kind === "pull_request" && inlineTarget) {
      const normalizedPath = inlineTarget.path.trim();
      if (!normalizedPath) {
        throw new Error("Inline comment path cannot be empty.");
      }
      const hasOldLine = typeof inlineTarget.oldLine === "number" && Number.isInteger(inlineTarget.oldLine) && inlineTarget.oldLine > 0;
      const hasNewLine = typeof inlineTarget.newLine === "number" && Number.isInteger(inlineTarget.newLine) && inlineTarget.newLine > 0;
      if (!hasOldLine && !hasNewLine) {
        throw new Error("Inline comment requires a valid line number.");
      }

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
            old_path: normalizedPath,
            new_path: normalizedPath,
            old_line: hasOldLine ? inlineTarget.oldLine : null,
            new_line: hasNewLine ? inlineTarget.newLine : null
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

  async function createForgePullRequestForRepo(
    repo: ForgeRepoSummary,
    sourceBranch: string,
    payload: ForgeCreatePullRequestPayload,
    options: ForgeRequestOptions
  ): Promise<ForgeWorkItemDetail> {
    if (!sourceBranch || sourceBranch === "HEAD") {
      throw new Error("The active workspace is not on a named branch.");
    }
    if (!payload.baseBranch.trim()) {
      throw new Error("Choose a base branch.");
    }
    if (sourceBranch === payload.baseBranch.trim()) {
      throw new Error("The source branch and base branch cannot be the same.");
    }
    if (!payload.title.trim()) {
      throw new Error("Enter a pull request title.");
    }

    if (repo.provider === "github") {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      };
      if (options.githubToken) {
        headers.Authorization = `Bearer ${options.githubToken}`;
      }

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

      const item = await response.json();
      return fetchForgeWorkItemDetail(repo, "pull_request", item.number, options);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (options.gitlabToken) {
      headers["PRIVATE-TOKEN"] = options.gitlabToken;
    }

    const baseUrl = `https://${repo.host}/api/v4/projects/${encodeURIComponent(repo.fullName)}`;
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

    const item = await response.json();
    return fetchForgeWorkItemDetail(repo, "pull_request", item.iid, options);
  }

  return {
    fetchForgeOverviewForRepo,
    fetchGitlabUserMergeRequests,
    fetchForgeBranchPullRequestStatusForRepo,
    fetchForgeWorkItemDetail,
    fetchForgeWorkflowRunDetailForRepo,
    performForgeWorkItemActionForRepo,
    addForgeWorkItemCommentForRepo,
    createForgePullRequestForRepo
  };
}
