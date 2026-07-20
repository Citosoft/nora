export interface ExternalHarnessThreadArchiveRef {
  workspacePath: string;
  toolId: string;
  conversationId: string;
  primaryArtifactPath: string;
}

export interface ExternalHarnessThreadArchiveRecord extends ExternalHarnessThreadArchiveRef {
  archivedAt: string;
}

export interface ExternalHarnessThreadArchiveFile {
  version: 1;
  records: ExternalHarnessThreadArchiveRecord[];
}
