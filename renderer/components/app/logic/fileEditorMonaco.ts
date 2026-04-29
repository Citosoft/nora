import { joinWorkspacePath } from "@/components/app/logic/appUtils";
import type { ResolvedTheme } from "@/components/app/types";
import type { FileEditorThemeId } from "@shared/appTypes";

const MONACO_TS_PATH_ALIASES = {
  "@/*": ["renderer/*"],
  "@shared/*": ["shared/*"],
  "@main/*": ["main/*"]
} as const;

const MONACO_LANGUAGE_ID_BY_FILE_NAME = new Map<string, string>([
  [".editorconfig", "ini"],
  [".gitattributes", "ini"],
  [".gitconfig", "ini"],
  ["config", "ini"],
  ["dockerfile", "dockerfile"],
  ["gemfile", "ruby"],
  ["rakefile", "ruby"]
]);

const MONACO_LANGUAGE_SUFFIXES: ReadonlyArray<{ suffix: string; languageId: string }> = [
  { suffix: ".graphqls", languageId: "graphql" },
  { suffix: ".dockerfile", languageId: "dockerfile" },
  { suffix: ".markdown", languageId: "markdown" },
  { suffix: ".handlebars", languageId: "handlebars" },
  { suffix: ".properties", languageId: "ini" },
  { suffix: ".graphql", languageId: "graphql" },
  { suffix: ".tfvars", languageId: "hcl" },
  { suffix: ".tsx", languageId: "typescript" },
  { suffix: ".cts", languageId: "typescript" },
  { suffix: ".mts", languageId: "typescript" },
  { suffix: ".jsx", languageId: "javascript" },
  { suffix: ".mjs", languageId: "javascript" },
  { suffix: ".cjs", languageId: "javascript" },
  { suffix: ".json", languageId: "json" },
  { suffix: ".jsonc", languageId: "json" },
  { suffix: ".scss", languageId: "scss" },
  { suffix: ".less", languageId: "less" },
  { suffix: ".html", languageId: "html" },
  { suffix: ".htm", languageId: "html" },
  { suffix: ".xhtml", languageId: "html" },
  { suffix: ".mdx", languageId: "mdx" },
  { suffix: ".md", languageId: "markdown" },
  { suffix: ".yml", languageId: "yaml" },
  { suffix: ".yaml", languageId: "yaml" },
  { suffix: ".bash", languageId: "shell" },
  { suffix: ".zsh", languageId: "shell" },
  { suffix: ".ksh", languageId: "shell" },
  { suffix: ".fish", languageId: "shell" },
  { suffix: ".sh", languageId: "shell" },
  { suffix: ".ps1", languageId: "powershell" },
  { suffix: ".psm1", languageId: "powershell" },
  { suffix: ".psd1", languageId: "powershell" },
  { suffix: ".bat", languageId: "bat" },
  { suffix: ".cmd", languageId: "bat" },
  { suffix: ".pyw", languageId: "python" },
  { suffix: ".py", languageId: "python" },
  { suffix: ".rbw", languageId: "ruby" },
  { suffix: ".rb", languageId: "ruby" },
  { suffix: ".php", languageId: "php" },
  { suffix: ".phtml", languageId: "php" },
  { suffix: ".go", languageId: "go" },
  { suffix: ".rs", languageId: "rust" },
  { suffix: ".java", languageId: "java" },
  { suffix: ".cs", languageId: "csharp" },
  { suffix: ".swift", languageId: "swift" },
  { suffix: ".kt", languageId: "kotlin" },
  { suffix: ".kts", languageId: "kotlin" },
  { suffix: ".scala", languageId: "scala" },
  { suffix: ".sc", languageId: "scala" },
  { suffix: ".lua", languageId: "lua" },
  { suffix: ".sql", languageId: "sql" },
  { suffix: ".xml", languageId: "xml" },
  { suffix: ".xsd", languageId: "xml" },
  { suffix: ".xsl", languageId: "xml" },
  { suffix: ".xslt", languageId: "xml" },
  { suffix: ".xaml", languageId: "xml" },
  { suffix: ".svg", languageId: "xml" },
  { suffix: ".ini", languageId: "ini" },
  { suffix: ".toml", languageId: "ini" },
  { suffix: ".cfg", languageId: "ini" },
  { suffix: ".conf", languageId: "ini" },
  { suffix: ".tf", languageId: "hcl" },
  { suffix: ".hcl", languageId: "hcl" },
  { suffix: ".gql", languageId: "graphql" },
  { suffix: ".pl", languageId: "perl" },
  { suffix: ".pm", languageId: "perl" },
  { suffix: ".r", languageId: "r" },
  { suffix: ".c", languageId: "c" },
  { suffix: ".h", languageId: "c" },
  { suffix: ".cpp", languageId: "cpp" },
  { suffix: ".cc", languageId: "cpp" },
  { suffix: ".cxx", languageId: "cpp" },
  { suffix: ".hpp", languageId: "cpp" },
  { suffix: ".hh", languageId: "cpp" },
  { suffix: ".hxx", languageId: "cpp" },
  { suffix: ".m", languageId: "objective-c" },
  { suffix: ".mm", languageId: "objective-c" },
  { suffix: ".ts", languageId: "typescript" },
  { suffix: ".js", languageId: "javascript" }
];

const MONACO_WORKSPACE_SUPPORT_FILE_PATTERN = /\.(d\.ts|tsx|ts|jsx|js|mjs|cjs|json)$/i;
const FILE_EDITOR_MONACO_THEME_MAP: Record<FileEditorThemeId, Record<ResolvedTheme, string>> = {
  default: {
    light: "vs",
    dark: "vs-dark"
  },
  "high-contrast": {
    light: "hc-light",
    dark: "hc-black"
  }
};

type MonacoCompilerDefaults = {
  setEagerModelSync: (value: boolean) => void;
  setCompilerOptions: (value: Record<string, unknown>) => void;
};

type MonacoTypeScriptApi = {
  JsxEmit: {
    ReactJSX: number;
  };
  ModuleKind: {
    ESNext: number;
  };
  ModuleResolutionKind: {
    NodeJs: number;
  };
  ScriptTarget: {
    ES2022: number;
  };
  typescriptDefaults: MonacoCompilerDefaults;
  javascriptDefaults: MonacoCompilerDefaults;
};

type MonacoTypeScriptHost = {
  languages: {
    typescript: MonacoTypeScriptApi;
  };
};

function isMonacoTypeScriptHost(value: unknown): value is MonacoTypeScriptHost {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    languages?: {
      typescript?: Partial<MonacoTypeScriptApi>;
    };
  };
  const typescript = candidate.languages?.typescript;
  return Boolean(
    typescript &&
    typescript.JsxEmit &&
    typescript.ModuleKind &&
    typescript.ModuleResolutionKind &&
    typescript.ScriptTarget &&
    typescript.typescriptDefaults &&
    typescript.javascriptDefaults
  );
}

function normalizeMonacoFileSystemPath(pathName: string, rootPath: string | null): string {
  const absolutePath = rootPath ? joinWorkspacePath(rootPath, pathName) : pathName;
  const normalized = absolutePath.replace(/\\/g, "/");
  if (normalized.startsWith("/") || normalized.startsWith("//") || /^[A-Za-z]:\//.test(normalized)) {
    return normalized;
  }
  return `/${normalized.replace(/^\/+/, "")}`;
}

export function resolveMonacoLanguageId(pathName: string): string {
  const normalizedPath = pathName.replace(/\\/g, "/").toLowerCase();
  const fileName = normalizedPath.split("/").pop() ?? normalizedPath;

  if (fileName === "dockerfile" || fileName.startsWith("dockerfile.")) {
    return "dockerfile";
  }

  const fileNameLanguageId = MONACO_LANGUAGE_ID_BY_FILE_NAME.get(fileName);
  if (fileNameLanguageId) {
    return fileNameLanguageId;
  }

  for (const { suffix, languageId } of MONACO_LANGUAGE_SUFFIXES) {
    if (normalizedPath.endsWith(suffix)) {
      return languageId;
    }
  }

  return "plaintext";
}

export function resolveFileEditorMonacoTheme(
  fileEditorThemeId: FileEditorThemeId,
  resolvedTheme: ResolvedTheme
): string {
  return FILE_EDITOR_MONACO_THEME_MAP[fileEditorThemeId][resolvedTheme];
}

export function buildMonacoModelPath(pathName: string, rootPath: string | null): string {
  const normalizedPath = normalizeMonacoFileSystemPath(pathName, rootPath);
  if (normalizedPath.startsWith("//")) {
    return encodeURI(`file:${normalizedPath}`);
  }
  if (normalizedPath.startsWith("/")) {
    return encodeURI(`file://${normalizedPath}`);
  }
  return encodeURI(`file:///${normalizedPath}`);
}

export function normalizeMonacoCompilerBaseUrl(rootPath: string | null): string {
  const normalized = normalizeMonacoFileSystemPath("", rootPath).replace(/\/+$/, "");
  return normalized || "/";
}

export function shouldLoadMonacoWorkspaceSupportFile(pathName: string): boolean {
  const normalized = pathName.replace(/\\/g, "/");
  if (!MONACO_WORKSPACE_SUPPORT_FILE_PATTERN.test(normalized)) {
    return false;
  }
  if (
    normalized.startsWith("dist/") ||
    normalized.startsWith("dist-tests/") ||
    normalized.startsWith("node_modules/")
  ) {
    return false;
  }
  return true;
}

export function configureMonacoTypeScript(monaco: unknown, rootPath: string | null): void {
  if (!isMonacoTypeScriptHost(monaco)) {
    return;
  }

  const typeScriptApi = monaco.languages.typescript;
  const compilerOptions = {
    allowJs: true,
    allowNonTsExtensions: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    forceConsistentCasingInFileNames: true,
    jsx: typeScriptApi.JsxEmit.ReactJSX,
    module: typeScriptApi.ModuleKind.ESNext,
    moduleResolution: typeScriptApi.ModuleResolutionKind.NodeJs,
    noEmit: true,
    resolveJsonModule: true,
    strict: true,
    target: typeScriptApi.ScriptTarget.ES2022,
    baseUrl: normalizeMonacoCompilerBaseUrl(rootPath),
    paths: MONACO_TS_PATH_ALIASES
  };

  typeScriptApi.typescriptDefaults.setEagerModelSync(true);
  typeScriptApi.javascriptDefaults.setEagerModelSync(true);
  typeScriptApi.typescriptDefaults.setCompilerOptions(compilerOptions);
  typeScriptApi.javascriptDefaults.setCompilerOptions(compilerOptions);
}
