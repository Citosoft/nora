import { readFile, stat } from "node:fs/promises";
import type { AppImportJsonFile, AppImportTextFile } from "@main/types/app-import/appImportSource.types";

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "ENOTDIR");
}

export async function pathExists(target: string): Promise<boolean> {
  return await stat(target).then(() => true, () => false);
}

export async function isDirectory(target: string): Promise<boolean> {
  return await stat(target).then((info) => info.isDirectory(), () => false);
}

export async function readTextFile(target: string): Promise<AppImportTextFile> {
  try {
    return { status: "ok", text: await readFile(target, "utf8") };
  } catch (error) {
    if (isMissing(error)) return { status: "missing" };
    return { status: "invalid", reason: error instanceof Error ? error.message : "Could not read the file" };
  }
}

/** Raw JSON at the source-app boundary; callers narrow `value` with a schema. */
export async function readJsonFile(target: string): Promise<AppImportJsonFile> {
  const file = await readTextFile(target);
  if (file.status !== "ok") return file;
  try {
    const value: unknown = JSON.parse(file.text);
    return { status: "ok", value };
  } catch {
    return { status: "invalid", reason: "The file is not valid JSON" };
  }
}
