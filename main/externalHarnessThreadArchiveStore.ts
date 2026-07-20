import type { ExternalHarnessContextRef } from "@shared/appTypes";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  ExternalHarnessThreadArchiveFile,
  ExternalHarnessThreadArchiveRecord,
  ExternalHarnessThreadArchiveRef
} from "./types/externalHarnessThreadArchive.types";

const ARCHIVE_VERSION = 1;

const normalizeArchivePart = (value: string): string => value.trim();

export const buildExternalHarnessThreadArchiveKey = (ref: ExternalHarnessThreadArchiveRef): string =>
  [
    normalizeArchivePart(ref.workspacePath),
    normalizeArchivePart(ref.toolId),
    normalizeArchivePart(ref.conversationId),
    normalizeArchivePart(ref.primaryArtifactPath)
  ].join("\0");

const isArchiveRecord = (value: unknown): value is ExternalHarnessThreadArchiveRecord => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ExternalHarnessThreadArchiveRecord>;
  return (
    typeof candidate.workspacePath === "string" &&
    typeof candidate.toolId === "string" &&
    typeof candidate.conversationId === "string" &&
    typeof candidate.primaryArtifactPath === "string" &&
    typeof candidate.archivedAt === "string"
  );
};

const normalizeArchiveFile = (value: unknown): ExternalHarnessThreadArchiveFile => {
  if (!value || typeof value !== "object") {
    return { version: ARCHIVE_VERSION, records: [] };
  }
  const candidate = value as Partial<ExternalHarnessThreadArchiveFile>;
  const records = Array.isArray(candidate.records) ? candidate.records.filter(isArchiveRecord) : [];
  const unique = new Map<string, ExternalHarnessThreadArchiveRecord>();
  for (const record of records) {
    unique.set(buildExternalHarnessThreadArchiveKey(record), record);
  }
  return { version: ARCHIVE_VERSION, records: Array.from(unique.values()) };
};

export class ExternalHarnessThreadArchiveStore {
  constructor(private readonly filePath: string) {}

  async listKeys(): Promise<Set<string>> {
    const archive = await this.readArchive();
    return new Set(archive.records.map((record) => buildExternalHarnessThreadArchiveKey(record)));
  }

  async archive(ref: ExternalHarnessContextRef, archivedAt: string): Promise<void> {
    const archive = await this.readArchive();
    const recordsByKey = new Map<string, ExternalHarnessThreadArchiveRecord>();
    for (const record of archive.records) {
      recordsByKey.set(buildExternalHarnessThreadArchiveKey(record), record);
    }

    const record: ExternalHarnessThreadArchiveRecord = {
      workspacePath: ref.workspacePath,
      toolId: ref.toolId,
      conversationId: ref.conversationId,
      primaryArtifactPath: ref.primaryArtifactPath,
      archivedAt
    };
    recordsByKey.set(buildExternalHarnessThreadArchiveKey(record), record);
    await this.writeArchive({ version: ARCHIVE_VERSION, records: Array.from(recordsByKey.values()) });
  }

  private async readArchive(): Promise<ExternalHarnessThreadArchiveFile> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      return normalizeArchiveFile(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { version: ARCHIVE_VERSION, records: [] };
      }
      throw error;
    }
  }

  private async writeArchive(archive: ExternalHarnessThreadArchiveFile): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, `${JSON.stringify(normalizeArchiveFile(archive), null, 2)}\n`, "utf8");
  }
}
