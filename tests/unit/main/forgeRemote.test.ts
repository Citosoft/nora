import { createForgeRemoteOps } from "@main/orchestrator/forgeRemote";
import type { ForgeRepoSummary } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const githubRepo: ForgeRepoSummary = {
  provider: "github",
  host: "github.com",
  owner: "owner",
  name: "repo",
  fullName: "owner/repo",
  webUrl: "https://github.com/owner/repo"
};

function createJsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init
  });
}

function getRequestUrl(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
}

function getJsonBody(init?: RequestInit): Record<string, unknown> {
  const body = typeof init?.body === "string" ? init.body : "{}";
  const parsed = JSON.parse(body) as unknown;
  assert.equal(typeof parsed, "object");
  assert.notEqual(parsed, null);
  return parsed as Record<string, unknown>;
}

test("fetchForgeWorkItemDetail includes GitHub PR review comments as inline comments", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = getRequestUrl(input);
    if (url.endsWith("/pulls/42")) {
      return createJsonResponse({
        number: 42,
        title: "Tighten auth validation",
        state: "open",
        body: "PR body",
        updated_at: "2026-06-05T10:00:00.000Z",
        html_url: "https://github.com/owner/repo/pull/42",
        user: { login: "author" },
        head: { ref: "feature/auth", sha: "abc123" },
        base: { ref: "main" },
        merged: false,
        labels: []
      });
    }
    if (url.endsWith("/issues/42/comments?per_page=50")) {
      return createJsonResponse([]);
    }
    if (url.endsWith("/pulls/42/files?per_page=100")) {
      return createJsonResponse([
        {
          sha: "file-sha",
          filename: "src/auth.ts",
          additions: 1,
          deletions: 0,
          patch: "@@ -7,2 +7,3 @@\n const input = request.body;\n+validateInput(input);\n return input;"
        }
      ]);
    }
    if (url.endsWith("/pulls/42/comments?per_page=100")) {
      return createJsonResponse([
        {
          id: 991,
          pull_request_review_id: 18,
          body: "Please make this reusable.",
          created_at: "2026-06-05T10:01:00.000Z",
          path: "src/auth.ts",
          side: "RIGHT",
          line: 8,
          user: { login: "reviewer", avatar_url: "https://example.test/avatar.png" }
        }
      ]);
    }
    return createJsonResponse({ message: `Unexpected URL: ${url}` }, { status: 404 });
  };

  const ops = createForgeRemoteOps(() => 0);
  const detail = await ops.fetchForgeWorkItemDetail(githubRepo, "pull_request", 42, {});

  assert.equal(detail.capabilities.supportsInlineComments, true);
  assert.equal(detail.comments.length, 1);
  assert.equal(detail.comments[0].id, "github-review-comment-991");
  assert.equal(detail.comments[0].path, "src/auth.ts");
  assert.equal(detail.comments[0].oldLine, null);
  assert.equal(detail.comments[0].newLine, 8);
  assert.equal(detail.comments[0].threadId, "18");
});

test("addForgeWorkItemCommentForRepo posts GitHub inline comments as PR review comments", async (t) => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = getRequestUrl(input);
    requests.push({ url, init });
    if (url.endsWith("/pulls/42") && !init?.method) {
      return createJsonResponse({ head: { sha: "abc123" } });
    }
    if (url.endsWith("/pulls/42/comments") && init?.method === "POST") {
      return createJsonResponse({ id: 992 });
    }
    return createJsonResponse({ message: `Unexpected URL: ${url}` }, { status: 404 });
  };

  const ops = createForgeRemoteOps(() => 0);
  await ops.addForgeWorkItemCommentForRepo(
    githubRepo,
    "pull_request",
    42,
    {
      body: "Please make this reusable.",
      inlineTarget: {
        path: "src/auth.ts",
        oldLine: null,
        newLine: 8
      }
    },
    { githubToken: "token" }
  );

  const postRequest = requests.find((request) => request.url.endsWith("/pulls/42/comments"));
  assert.ok(postRequest);
  assert.equal(postRequest.init?.method, "POST");
  assert.equal((postRequest.init?.headers as Record<string, string>).Authorization, "Bearer token");
  assert.deepEqual(getJsonBody(postRequest.init), {
    body: "Please make this reusable.",
    commit_id: "abc123",
    path: "src/auth.ts",
    side: "RIGHT",
    line: 8
  });
});
