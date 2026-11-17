export type ChangesCheckoutKind = "project" | "worktree";

export interface ChangesCheckoutThread {
  id: string;
  title: string;
}

/** One checkout the Changes panel can show, with the threads working in it. */
export interface ChangesCheckoutOption {
  path: string;
  kind: ChangesCheckoutKind;
  branch: string;
  threads: readonly ChangesCheckoutThread[];
}

export interface ChangesCheckoutPickerProps {
  options: readonly ChangesCheckoutOption[];
  selectedPath: string;
  disabled: boolean;
  onSelect(path: string): void;
}
