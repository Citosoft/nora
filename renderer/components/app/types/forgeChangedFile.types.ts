import type { ResolvedTheme } from "@/components/app/types";
import type { ForgeAddCommentPayload, ForgeWorkItemComment, ForgeWorkItemFileChange } from "@shared/appTypes";

export interface ForgeChangedFileProps {
  change: ForgeWorkItemFileChange;
  commentsByLine: Map<string, ForgeWorkItemComment[]>;
  expanded: boolean;
  supportsInlineComments: boolean;
  commentLoading: boolean;
  resolvedTheme: ResolvedTheme;
  onToggle: () => void;
  onCommentSubmit: (payload: ForgeAddCommentPayload) => Promise<void>;
}

export interface ForgeInlineComposerTarget {
  key: string;
  path: string;
  oldLine: number | null;
  newLine: number | null;
}

export interface ForgeChangedFilesTreeProps {
  changes: ForgeWorkItemFileChange[];
  selectedChangePath: string | null;
  onSelectChange: (changePath: string) => void;
  onClose: () => void;
}
