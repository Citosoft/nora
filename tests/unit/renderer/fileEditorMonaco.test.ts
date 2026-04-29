import {
  buildMonacoModelPath,
  normalizeMonacoCompilerBaseUrl,
  resolveFileEditorMonacoTheme,
  resolveMonacoLanguageId,
  shouldLoadMonacoWorkspaceSupportFile
} from "@/components/app/logic/fileEditorMonaco";
import assert from "node:assert/strict";
import test from "node:test";

test("buildMonacoModelPath uses the workspace root for repo-relative files", () => {
  assert.equal(
    buildMonacoModelPath("renderer/components/app/panels/FileEditorPanel.tsx", "/home/daniel/dev/personal/nora"),
    "file:///home/daniel/dev/personal/nora/renderer/components/app/panels/FileEditorPanel.tsx"
  );
});

test("buildMonacoModelPath preserves Windows drive-letter paths", () => {
  assert.equal(
    buildMonacoModelPath("src\\index.ts", "C:\\repo"),
    "file:///C:/repo/src/index.ts"
  );
});

test("normalizeMonacoCompilerBaseUrl returns a normalized workspace root", () => {
  assert.equal(normalizeMonacoCompilerBaseUrl("/home/daniel/dev/personal/nora/"), "/home/daniel/dev/personal/nora");
});

test("shouldLoadMonacoWorkspaceSupportFile includes source files and excludes generated output", () => {
  assert.equal(shouldLoadMonacoWorkspaceSupportFile("renderer/components/app/panels/FileEditorPanel.tsx"), true);
  assert.equal(shouldLoadMonacoWorkspaceSupportFile("shared/types/ai.types.ts"), true);
  assert.equal(shouldLoadMonacoWorkspaceSupportFile("dist/renderer/main.js"), false);
  assert.equal(shouldLoadMonacoWorkspaceSupportFile("node_modules/pkg/index.d.ts"), false);
});

test("resolveMonacoLanguageId recognizes a wider set of Monaco-supported languages", () => {
  assert.equal(resolveMonacoLanguageId("src/app.py"), "python");
  assert.equal(resolveMonacoLanguageId("src/server.rb"), "ruby");
  assert.equal(resolveMonacoLanguageId("src/main.go"), "go");
  assert.equal(resolveMonacoLanguageId("src/lib.rs"), "rust");
  assert.equal(resolveMonacoLanguageId("src/App.java"), "java");
  assert.equal(resolveMonacoLanguageId("src/Program.cs"), "csharp");
  assert.equal(resolveMonacoLanguageId("src/main.swift"), "swift");
  assert.equal(resolveMonacoLanguageId("src/build.gradle.kts"), "kotlin");
  assert.equal(resolveMonacoLanguageId("src/schema.graphql"), "graphql");
  assert.equal(resolveMonacoLanguageId("infra/main.tf"), "hcl");
  assert.equal(resolveMonacoLanguageId("ops/deploy.ps1"), "powershell");
  assert.equal(resolveMonacoLanguageId("ops/start.bat"), "bat");
  assert.equal(resolveMonacoLanguageId("config/app.toml"), "ini");
  assert.equal(resolveMonacoLanguageId("assets/logo.svg"), "xml");
  assert.equal(resolveMonacoLanguageId("Dockerfile"), "dockerfile");
  assert.equal(resolveMonacoLanguageId("docker/Dockerfile.dev"), "dockerfile");
  assert.equal(resolveMonacoLanguageId(".editorconfig"), "ini");
  assert.equal(resolveMonacoLanguageId("notes/file.unknown"), "plaintext");
});

test("resolveFileEditorMonacoTheme keeps Monaco themes in sync with light and dark app modes", () => {
  assert.equal(resolveFileEditorMonacoTheme("default", "light"), "vs");
  assert.equal(resolveFileEditorMonacoTheme("default", "dark"), "vs-dark");
  assert.equal(resolveFileEditorMonacoTheme("high-contrast", "light"), "hc-light");
  assert.equal(resolveFileEditorMonacoTheme("high-contrast", "dark"), "hc-black");
});
