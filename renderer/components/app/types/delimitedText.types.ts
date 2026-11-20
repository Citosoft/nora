export type { DelimitedTable } from "@shared/types/text/delimited.types";
export interface DelimitedTableViewProps { content: string; delimiter: string; }
export type DelimitedFileView = "table" | "text";
export interface FileEditorViewOption<T extends string> { value: T; label: string; icon: import("lucide-react").LucideIcon; }
export interface FileEditorViewToggleProps<T extends string> {
  label: string;
  value: T;
  options: readonly FileEditorViewOption<T>[];
  onChange(value: T): void;
}
