import { BROWSER_INSPECT_MESSAGE_PREFIX } from "@/components/app/logic/browserAnnotation";
import {
  buildBrowserInspectInstallScript,
  buildBrowserInspectRepinScript,
  buildBrowserInspectTeardownScript,
  parseBrowserInspectTargetMessage
} from "@/components/app/logic/browserInspectScript";
import type { BrowserAnnotation } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

test("buildBrowserInspectInstallScript installs guarded inspect listeners", () => {
  const script = buildBrowserInspectInstallScript();
  assert.match(script, /__NORA_INSPECT_ACTIVE__/);
  assert.match(script, new RegExp(BROWSER_INSPECT_MESSAGE_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(script, /__NORA_INSPECT_TEARDOWN__/);
  assert.match(script, /preventDefault/);
});

test("buildBrowserInspectTeardownScript removes inspect overlays", () => {
  const script = buildBrowserInspectTeardownScript();
  assert.match(script, /__NORA_INSPECT_TEARDOWN__/);
  assert.match(script, /nora-inspect-highlight/);
  assert.match(script, /nora-inspect-root/);
});

test("buildBrowserInspectRepinScript embeds selector fallbacks for badges", () => {
  const annotations: BrowserAnnotation[] = [
    {
      id: "annotation-1",
      createdAt: "2026-06-03T12:00:00.000Z",
      target: {
        pageUrl: "https://example.com",
        pageTitle: "Example",
        selector: "button.submit",
        selectorFallbacks: ["button.primary"],
        tagName: "BUTTON",
        textPreview: "Submit",
        htmlSnippet: "<button>Submit</button>",
        attributes: {}
      },
      body: "Fix spacing"
    }
  ];

  const script = buildBrowserInspectRepinScript(annotations);
  assert.match(script, /button\.submit/);
  assert.match(script, /button\.primary/);
  assert.match(script, /annotation-1/);
});

test("parseBrowserInspectTargetMessage normalizes guest payload", () => {
  const message = `${BROWSER_INSPECT_MESSAGE_PREFIX}${JSON.stringify({
    selector: "button.submit",
    selectorFallbacks: ["button.primary"],
    tagName: "BUTTON",
    textPreview: "Submit",
    htmlSnippet: "<button>Submit</button>",
    attributes: { class: "submit" }
  })}`;

  const target = parseBrowserInspectTargetMessage(message, "https://example.com", "Example");
  assert.ok(target);
  assert.equal(target?.selector, "button.submit");
  assert.equal(target?.pageUrl, "https://example.com");
  assert.equal(target?.pageTitle, "Example");
  assert.equal(target?.tagName, "BUTTON");
});

test("parseBrowserInspectTargetMessage ignores unrelated console output", () => {
  assert.equal(parseBrowserInspectTargetMessage("hello world", "https://example.com", "Example"), null);
});
