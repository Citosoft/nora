import { filterPathsByPrefix, normalizeListPrefix, shapeReadFileResult } from "@/components/app/ai/workspaceAiChatToolUtils";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import type { AiChatMode } from "@/components/app/types";
import { tool, zodSchema } from "ai";
import { z } from "zod";

const MAX_LIST_RESULTS = 500;
const DEFAULT_LIST_LIMIT = 200;

export type WorkspaceAiChatToolContext = {
  projectId: string;
  rootPath?: string;
  mode: AiChatMode;
  onSetChatTitle?: (title: string) => void;
};

const WORKSPACE_SPECS_DIR = ".nora/specs";

function slugifySpecName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "spec";
}

function normalizeSpecFileName(input: string | undefined, title: string): string {
  const rawBase = (input?.trim().length ? input.trim() : slugifySpecName(title)).replace(/\\/g, "/");
  const baseName = rawBase.split("/").filter(Boolean).at(-1) ?? slugifySpecName(title);
  const withoutExt = baseName.replace(/\.(md|markdown)$/i, "");
  const safe = slugifySpecName(withoutExt);
  return `${safe}.md`;
}

async function resolveUniqueSpecPath(
  projectId: string,
  rootPath: string | undefined,
  fileName: string
): Promise<string> {
  const extMatch = fileName.match(/\.(md|markdown)$/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : ".md";
  const stem = fileName.replace(/\.(md|markdown)$/i, "");
  let attempt = 0;
  while (attempt < 200) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const candidate = `${WORKSPACE_SPECS_DIR}/${stem}${suffix}${ext}`;
    const stat = await noraWorkspaceClient.statWorkspacePath({ projectId, rootPath, path: candidate });
    if (!stat.exists) {
      return candidate;
    }
    attempt += 1;
  }
  throw new Error("Unable to allocate a unique spec path after multiple attempts.");
}

export function createWorkspaceAiChatTools(ctx: WorkspaceAiChatToolContext) {
  const fileRequestBase = { projectId: ctx.projectId, rootPath: ctx.rootPath };
  const readOnlyTools = {
    read_workspace_file: tool({
      description:
        "Read a text file from the workspace using a path relative to the repo root (forward slashes). For large files, pass startLine/endLine (1-based, inclusive).",
      inputSchema: zodSchema(
        z.object({
          path: z.string().min(1).describe("Repo-relative file path using /"),
          startLine: z.number().int().positive().optional().describe("1-based start line"),
          endLine: z.number().int().positive().optional().describe("1-based end line (inclusive)")
        })
      ),
      execute: async (input) => {
        const raw = await noraWorkspaceClient.readWorkspaceFile({ ...fileRequestBase, path: input.path });
        return shapeReadFileResult(raw, input.startLine, input.endLine);
      }
    }),
    list_workspace_files: tool({
      description:
        "List git-tracked and untracked files (git ls-files). Optional path prefix filters to paths under that directory. Results are sorted and capped.",
      inputSchema: zodSchema(
        z.object({
          pathPrefix: z.string().optional().describe("Only include paths equal to or under this prefix (forward slashes)"),
          limit: z
            .number()
            .int()
            .positive()
            .max(MAX_LIST_RESULTS)
            .optional()
            .describe(`Maximum paths to return (default ${DEFAULT_LIST_LIMIT}, max ${MAX_LIST_RESULTS})`)
        })
      ),
      execute: async (input) => {
        const limit = Math.min(input.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_RESULTS);
        const paths = await noraWorkspaceClient.listWorkspaceFiles(ctx.projectId, ctx.rootPath);
        const prefix = normalizeListPrefix(input.pathPrefix);
        const filtered = filterPathsByPrefix(paths, prefix).sort((left, right) => left.localeCompare(right));
        const truncated = filtered.length > limit;
        return {
          paths: filtered.slice(0, limit),
          totalMatched: filtered.length,
          returned: Math.min(limit, filtered.length),
          truncated
        };
      }
    }),
    list_workspace_directories: tool({
      description:
        "List directories that appear in the workspace (from tracked paths and empty dirs). Optional path prefix filters results.",
      inputSchema: zodSchema(
        z.object({
          pathPrefix: z.string().optional().describe("Only include directories equal to or under this prefix"),
          limit: z
            .number()
            .int()
            .positive()
            .max(MAX_LIST_RESULTS)
            .optional()
            .describe(`Maximum directories to return (default ${DEFAULT_LIST_LIMIT}, max ${MAX_LIST_RESULTS})`)
        })
      ),
      execute: async (input) => {
        const limit = Math.min(input.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_RESULTS);
        const dirs = await noraWorkspaceClient.listWorkspaceDirectories(ctx.projectId, ctx.rootPath);
        const prefix = normalizeListPrefix(input.pathPrefix);
        const filtered = filterPathsByPrefix(dirs, prefix).sort((left, right) => left.localeCompare(right));
        const truncated = filtered.length > limit;
        return {
          directories: filtered.slice(0, limit),
          totalMatched: filtered.length,
          returned: Math.min(limit, filtered.length),
          truncated
        };
      }
    }),
    search_workspace: tool({
      description:
        "Search file contents with git grep. Separate words with spaces; multiple terms are combined with AND. Returns unique paths with a sample line each (server-capped).",
      inputSchema: zodSchema(
        z.object({
          query: z.string().min(1).describe("Search string; use spaces for ANDed terms (git grep --and -e)"),
          caseSensitive: z.boolean().optional().describe("Set true for case-sensitive search")
        })
      ),
      execute: async (input) => {
        const matches = await noraWorkspaceClient.searchWorkspaceFiles({
          projectId: ctx.projectId,
          rootPath: ctx.rootPath,
          query: input.query,
          caseSensitive: input.caseSensitive === true
        });
        return { matches };
      }
    }),
    stat_workspace_path: tool({
      description: "Check whether a repo-relative path exists and whether it is a file or directory.",
      inputSchema: zodSchema(
        z.object({
          path: z.string().min(1).describe("Repo-relative path using /")
        })
      ),
      execute: async (input) => noraWorkspaceClient.statWorkspacePath({ ...fileRequestBase, path: input.path })
    }),
    get_workspace_git_status: tool({
      description: "Return the current git branch and a short status listing (git status --short), truncated if very large.",
      inputSchema: zodSchema(z.object({})),
      execute: async () =>
        noraWorkspaceClient.getWorkspaceGitStatusSummary({ projectId: ctx.projectId, rootPath: ctx.rootPath })
    }),
    set_chat_title: tool({
      description:
        "Set a concise chat tab title that reflects the current conversation subject. Use title case, 3-6 words, max 64 chars.",
      inputSchema: zodSchema(
        z.object({
          title: z.string().min(3).max(64)
        })
      ),
      execute: async (input) => {
        const normalized = input.title.trim().replace(/\s+/g, " ");
        const nextTitle = normalized.length > 64 ? normalized.slice(0, 64).trim() : normalized;
        if (nextTitle.length < 3) {
          throw new Error("Title must be at least 3 characters.");
        }
        ctx.onSetChatTitle?.(nextTitle);
        return { title: nextTitle };
      }
    })
  };

  if (ctx.mode !== "plan") {
    return readOnlyTools;
  }

  return {
    ...readOnlyTools,
    create_specs: tool({
      description:
        "Create one or more Markdown specs in .nora/specs based on finalized planning details. Use only after clarifying requirements with the user.",
      inputSchema: zodSchema(
        z.object({
          specs: z.array(
            z.object({
              title: z.string().min(3).describe("Human-readable spec title"),
              content: z.string().min(1).describe("Full markdown spec content"),
              fileName: z.string().optional().describe("Optional filename; defaults to slug from title")
            })
          ).min(1),
          overwrite: z.boolean().optional().describe("If true, overwrite existing file names instead of suffixing")
        })
      ),
      execute: async (input) => {
        const createdPaths: string[] = [];
        for (const spec of input.specs) {
          const normalizedFileName = normalizeSpecFileName(spec.fileName, spec.title);
          const targetPath = input.overwrite
            ? `${WORKSPACE_SPECS_DIR}/${normalizedFileName}`
            : await resolveUniqueSpecPath(ctx.projectId, ctx.rootPath, normalizedFileName);
          await noraWorkspaceClient.writeWorkspaceFile({
            ...fileRequestBase,
            path: targetPath,
            content: spec.content
          });
          createdPaths.push(targetPath);
        }
        return {
          createdPaths,
          count: createdPaths.length
        };
      }
    })
  };
}

export type WorkspaceAiChatTools = ReturnType<typeof createWorkspaceAiChatTools>;
