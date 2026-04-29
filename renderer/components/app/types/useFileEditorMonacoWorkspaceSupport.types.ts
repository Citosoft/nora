import type { Monaco } from "@monaco-editor/react";

export type UseFileEditorMonacoWorkspaceSupportArgs = {
  monaco: Monaco | null;
  projectId: string | null;
  projectRootPath: string | null;
};
