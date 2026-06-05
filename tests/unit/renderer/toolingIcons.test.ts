import { getLocalToolIconColor, hasLocalToolIcon, toolLogoUrl } from "@/components/app/shared/Tooling";
import assert from "node:assert/strict";
import test from "node:test";

test("hasLocalToolIcon reports packaged logos for supported tools", () => {
  for (const toolId of ["codex", "claude", "gemini", "cursor", "copilot", "amp", "perplexity", "grok"]) {
    assert.equal(hasLocalToolIcon(toolId), true, `${toolId} uses a local icon`);
  }
});

test("hasLocalToolIcon leaves unsupported tools on favicon fallback", () => {
  for (const toolId of ["aider", "goose", "qwen", "opencode", "continue", "crush", "chatgpt"]) {
    assert.equal(hasLocalToolIcon(toolId), false, `${toolId} falls back to favicon loading`);
  }
});

test("getLocalToolIconColor uses foreground color for monochrome local logos", () => {
  for (const toolId of ["codex", "cursor", "copilot", "grok"]) {
    assert.equal(getLocalToolIconColor(toolId), "currentColor", `${toolId} uses theme foreground color`);
  }

  for (const toolId of ["claude", "gemini", "amp", "perplexity"]) {
    assert.equal(getLocalToolIconColor(toolId), "default", `${toolId} keeps its visible brand color`);
  }
});

test("toolLogoUrl uses official domains for catalog additions", () => {
  const expectedDomains: Record<string, string> = {
    pi: "pi.dev",
    antigravity: "antigravity.google",
    kilo: "kilo.ai",
    kiro: "kiro.dev",
    aug: "augmentcode.com",
    autohand: "autohand.ai",
    cline: "cline.bot",
    codebuff: "codebuff.com",
    droid: "docs.factory.ai",
    kimi: "kimi.com",
    "mistral-vibe": "mistral.ai",
    rovo: "atlassian.com",
    hermes: "nousresearch.com",
    openclaw: "openclaw.ai"
  };

  for (const [toolId, domain] of Object.entries(expectedDomains)) {
    assert.equal(toolLogoUrl(toolId).includes(`domain=${domain}`), true, `${toolId} uses ${domain}`);
  }
});
