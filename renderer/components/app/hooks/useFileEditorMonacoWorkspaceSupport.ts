import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import {
  buildMonacoModelPath,
  shouldLoadMonacoWorkspaceSupportFile
} from "@/components/app/logic/fileEditorMonaco";
import type { UseFileEditorMonacoWorkspaceSupportArgs } from "@/components/app/types/useFileEditorMonacoWorkspaceSupport.types";
import { useEffect, useRef } from "react";

type MonacoExtraLibDisposable = {
  dispose: () => void;
};

type MonacoEditorModelLookupHost = {
  editor: {
    getModel: (uri: { toString: () => string }) => unknown;
  };
  Uri: {
    parse: (value: string) => { toString: () => string };
  };
};

function isMonacoEditorModelLookupHost(value: unknown): value is MonacoEditorModelLookupHost {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    editor?: {
      getModel?: unknown;
    };
    Uri?: {
      parse?: unknown;
    };
  };

  return typeof candidate.editor?.getModel === "function" && typeof candidate.Uri?.parse === "function";
}

type MonacoExtraLibDefaultsHost = {
  languages: {
    typescript: {
      typescriptDefaults: {
        addExtraLib: (content: string, filePath?: string) => MonacoExtraLibDisposable;
      };
      javascriptDefaults: {
        addExtraLib: (content: string, filePath?: string) => MonacoExtraLibDisposable;
      };
    };
  };
};

function isMonacoExtraLibDefaultsHost(value: unknown): value is MonacoExtraLibDefaultsHost {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    languages?: {
      typescript?: {
        typescriptDefaults?: {
          addExtraLib?: unknown;
        };
        javascriptDefaults?: {
          addExtraLib?: unknown;
        };
      };
    };
  };

  return (
    typeof candidate.languages?.typescript?.typescriptDefaults?.addExtraLib === "function" &&
    typeof candidate.languages?.typescript?.javascriptDefaults?.addExtraLib === "function"
  );
}

export function useFileEditorMonacoWorkspaceSupport({
  monaco,
  projectId,
  projectRootPath
}: UseFileEditorMonacoWorkspaceSupportArgs): void {
  const extraLibDisposersRef = useRef<MonacoExtraLibDisposable[]>([]);

  useEffect(() => {
    if (!monaco || !projectId || !projectRootPath) {
      return;
    }
    if (!isMonacoEditorModelLookupHost(monaco) || !isMonacoExtraLibDefaultsHost(monaco)) {
      return;
    }

    let cancelled = false;

    const disposeExtraLibs = () => {
      extraLibDisposersRef.current.forEach((disposable) => disposable.dispose());
      extraLibDisposersRef.current = [];
    };

    void (async () => {
      const workspacePaths = await noraWorkspaceClient.listWorkspaceFiles(projectId, projectRootPath);
      const supportPaths = workspacePaths.filter(shouldLoadMonacoWorkspaceSupportFile);
      const supportEntries = await Promise.all(
        supportPaths.map(async (pathName) => {
          try {
            const content = await noraWorkspaceClient.readWorkspaceFile({
              projectId,
              path: pathName,
              rootPath: projectRootPath
            });
            return { pathName, content };
          } catch {
            return null;
          }
        })
      );

      if (cancelled) {
        return;
      }

      disposeExtraLibs();
      const nextDisposers: MonacoExtraLibDisposable[] = [];
      for (const entry of supportEntries) {
        if (!entry) {
          continue;
        }
        const monacoPath = buildMonacoModelPath(entry.pathName, projectRootPath);
        if (monaco.editor.getModel(monaco.Uri.parse(monacoPath))) {
          continue;
        }
        nextDisposers.push(monaco.languages.typescript.typescriptDefaults.addExtraLib(entry.content, monacoPath));
        nextDisposers.push(monaco.languages.typescript.javascriptDefaults.addExtraLib(entry.content, monacoPath));
      }
      extraLibDisposersRef.current = nextDisposers;
    })();

    return () => {
      cancelled = true;
      disposeExtraLibs();
    };
  }, [monaco, projectId, projectRootPath]);
}
