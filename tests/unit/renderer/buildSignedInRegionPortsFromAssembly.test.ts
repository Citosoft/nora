import { buildSessionCenterSurfacePortsFromAssembly } from "@/components/app/logic/buildSignedInRegionPortsFromAssembly";
import type { AppShellSignedInAssemblySources } from "@/components/app/types/appShellSignedInAssemblySources.types";
import assert from "node:assert/strict";
import test from "node:test";

test("buildSessionCenterSurfacePortsFromAssembly forwards session slices and core theme fields", () => {
  const snapshot = { project: null } as AppShellSignedInAssemblySources["core"]["snapshot"];
  const sessionSurfaceBase = { focusedBrowserTab: null } as AppShellSignedInAssemblySources["sessionSurface"];
  const centerTabs = {} as AppShellSignedInAssemblySources["centerTabs"];
  const aiModels = { aiModelOptions: {}, aiModelLoading: {} } as AppShellSignedInAssemblySources["aiModels"];
  const resolvedTheme = "dark" as const;
  const terminalThemeId = "vscode-dark" as AppShellSignedInAssemblySources["sessionSurface"]["terminalThemeId"];
  const terminalFontId = "jetbrains-mono" as AppShellSignedInAssemblySources["sessionSurface"]["terminalFontId"];

  const sessionSurface = { ...sessionSurfaceBase, terminalThemeId, terminalFontId };

  const assembly = {
    core: { snapshot, resolvedTheme } as AppShellSignedInAssemblySources["core"],
    sessionSurface,
    centerTabs,
    aiModels
  } as unknown as AppShellSignedInAssemblySources;

  const ports = buildSessionCenterSurfacePortsFromAssembly(assembly);

  assert.strictEqual(ports.sessionSurface, sessionSurface);
  assert.strictEqual(ports.centerTabs, centerTabs);
  assert.strictEqual(ports.aiModels, aiModels);
  assert.strictEqual(ports.resolvedTheme, resolvedTheme);
  assert.strictEqual(ports.terminalThemeId, terminalThemeId);
  assert.strictEqual(ports.terminalFontId, terminalFontId);
});
