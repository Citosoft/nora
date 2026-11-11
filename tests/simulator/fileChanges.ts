import type { TurnChange } from "@shared/types/conversation/review.types";

export const simulatedFileChanges: TurnChange[] = [
  { path: "src/main.ts", kind: "modified", beforeMode: "100644", afterMode: "100644", beforeHash: null, afterHash: null, presentation: "text",
    patch: "diff --git a/src/main.ts b/src/main.ts\n--- a/src/main.ts\n+++ b/src/main.ts\n@@ -1,2 +1,3 @@\n-export const title = 'Old';\n+export const title = 'Nora';\n+export const ready = true;\n start();\n" },
  { path: "src/app.tsx", kind: "modified", beforeMode: "100644", afterMode: "100644", beforeHash: null, afterHash: null, presentation: "text",
    patch: "diff --git a/src/app.tsx b/src/app.tsx\n--- a/src/app.tsx\n+++ b/src/app.tsx\n@@ -1 +1 @@\n-<h1>Before</h1>\n+<h1>After</h1>\n" }
];
export const simulatedPatches = Object.fromEntries(simulatedFileChanges.map((change) => [change.path, change.patch]));
