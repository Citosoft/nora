import type { WorkspaceFileIconKind } from "@/lib/types/workspaceFileIcon.types";

const BASENAME_KIND: Readonly<Record<string, WorkspaceFileIconKind>> = {
  brewfile: "code",
  capfile: "code",
  "cmakelists.txt": "code",
  containerfile: "config",
  dangerfile: "code",
  dockerfile: "config",
  fastfile: "code",
  gemfile: "code",
  gnumakefile: "terminal",
  justfile: "terminal",
  makefile: "terminal",
  podfile: "code",
  rakefile: "code",
  vagrantfile: "code",
  jenkinsfile: "code",
  berksfile: "code"
};

const JSON_EXT = new Set(["json", "jsonc", "json5", "tsbuildinfo"]);

const IMAGE_EXT = new Set([
  "avif",
  "bmp",
  "gif",
  "heic",
  "ico",
  "jpeg",
  "jpg",
  "png",
  "psd",
  "svg",
  "tif",
  "tiff",
  "webp"
]);

const VIDEO_EXT = new Set([
  "avi",
  "flv",
  "m4v",
  "mkv",
  "mov",
  "mp4",
  "mpeg",
  "mpg",
  "webm",
  "wmv"
]);

const AUDIO_EXT = new Set(["aac", "flac", "m4a", "mid", "midi", "mp3", "ogg", "opus", "wav", "wma"]);

const ARCHIVE_EXT = new Set(["7z", "bz2", "cab", "gz", "lz", "rar", "tar", "tgz", "xz", "zip", "zst"]);

const SHEET_EXT = new Set(["csv", "ods", "tsv", "xls", "xlsx"]);

const DIFF_EXT = new Set(["diff", "patch"]);

const KEYS_EXT = new Set(["cer", "crt", "csr", "key", "p12", "pem", "pfx", "pub"]);

const FONT_EXT = new Set(["eot", "otf", "ttf", "woff", "woff2"]);

const DATABASE_EXT = new Set(["db", "db3", "pgsql", "sql", "sqlite"]);

const MARKDOWN_EXT = new Set(["markdown", "md", "mdown", "mdx"]);

const TEXT_EXT = new Set(["gitattributes", "log", "rst", "text", "txt"]);

const CONFIG_EXT = new Set([
  "cfg",
  "conf",
  "dockerignore",
  "editorconfig",
  "env",
  "gitconfig",
  "ini",
  "mod",
  "node-version",
  "npmrc",
  "nvmrc",
  "plist",
  "pnpmrc",
  "properties",
  "toml",
  "tool-versions",
  "work",
  "xcconfig",
  "yaml",
  "yarnrc",
  "yml"
]);

const BINARY_EXT = new Set(["bin", "class", "dll", "dylib", "exe", "o", "obj", "pyc", "pyo", "so", "wasm"]);

const CODE_EXT = new Set([
  "asm",
  "c",
  "cc",
  "clj",
  "cljc",
  "cljs",
  "cpp",
  "cs",
  "css",
  "cts",
  "cxx",
  "dart",
  "edn",
  "erl",
  "ex",
  "exs",
  "fs",
  "fsi",
  "fsx",
  "go",
  "graphql",
  "gql",
  "gradle",
  "groovy",
  "h",
  "hh",
  "hpp",
  "hrl",
  "hs",
  "htm",
  "html",
  "hxx",
  "java",
  "jl",
  "js",
  "jsx",
  "kt",
  "kts",
  "lhs",
  "lua",
  "m",
  "mjs",
  "mm",
  "mts",
  "nim",
  "php",
  "phtml",
  "pls",
  "proto",
  "py",
  "pyi",
  "pyw",
  "r",
  "rake",
  "rb",
  "rs",
  "s",
  "scala",
  "sc",
  "scss",
  "sol",
  "styl",
  "svelte",
  "swift",
  "ts",
  "tsx",
  "v",
  "vhdl",
  "vhd",
  "vue",
  "wat",
  "wast",
  "xhtml",
  "xml",
  "xsd",
  "xslt",
  "zig",
  "cjs",
  "sass",
  "less",
  "pcss",
  "sh",
  "bash",
  "zsh",
  "fish"
]);

export function getWorkspaceFileLeafName(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export function getWorkspaceFileExtension(path: string): string {
  return extractExtension(getWorkspaceFileLeafName(path));
}

function extractExtension(leaf: string): string {
  const lastDot = leaf.lastIndexOf(".");
  if (lastDot <= 0) {
    return "";
  }
  return leaf.slice(lastDot + 1).toLowerCase();
}

export function getWorkspaceFileIconKind(path: string): WorkspaceFileIconKind {
  const leaf = getWorkspaceFileLeafName(path);
  if (!leaf) {
    return "generic";
  }
  const baseLower = leaf.toLowerCase();
  const fromBasename = BASENAME_KIND[baseLower];
  if (fromBasename) {
    return fromBasename;
  }
  if (baseLower === ".env" || baseLower.startsWith(".env.")) {
    return "config";
  }

  const ext = extractExtension(leaf);
  if (!ext) {
    return "generic";
  }
  if (ext === "lock") {
    return "config";
  }
  if (JSON_EXT.has(ext)) {
    return "json";
  }
  if (IMAGE_EXT.has(ext)) {
    return "image";
  }
  if (VIDEO_EXT.has(ext)) {
    return "video";
  }
  if (AUDIO_EXT.has(ext)) {
    return "audio";
  }
  if (ARCHIVE_EXT.has(ext)) {
    return "archive";
  }
  if (SHEET_EXT.has(ext)) {
    return "sheet";
  }
  if (DIFF_EXT.has(ext)) {
    return "diff";
  }
  if (KEYS_EXT.has(ext)) {
    return "keys";
  }
  if (FONT_EXT.has(ext)) {
    return "font";
  }
  if (DATABASE_EXT.has(ext)) {
    return "database";
  }
  if (MARKDOWN_EXT.has(ext)) {
    return "markdown";
  }
  if (TEXT_EXT.has(ext)) {
    return "text";
  }
  if (CONFIG_EXT.has(ext)) {
    return "config";
  }
  if (BINARY_EXT.has(ext)) {
    return "binary";
  }
  if (CODE_EXT.has(ext)) {
    return "code";
  }
  return "generic";
}
