import { parseForgeRepoSummary } from "@main/orchestrator/forgeRepoParse";
import assert from "node:assert/strict";
import test from "node:test";

test("parseForgeRepoSummary detects configured custom GitLab hosts", () => {
  const repo = parseForgeRepoSummary("git@code.example.com:team/product.git", {
    gitlabHost: "https://code.example.com"
  });

  assert.deepEqual(repo, {
    provider: "gitlab",
    host: "code.example.com",
    owner: "team",
    name: "product",
    fullName: "team/product",
    webUrl: "https://code.example.com/team/product"
  });
});

