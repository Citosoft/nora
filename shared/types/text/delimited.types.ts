/** A parsed CSV or TSV file, bounded for display. */
export interface DelimitedTable {
  /** The first row, used as column headings. */
  header: string[];
  rows: string[][];
  /** Columns whose non-empty cells are all numbers, so they can align on the decimal side. */
  numericColumns: boolean[];
  /** Data rows in the file, including any not shown. */
  totalRows: number;
  /** True when rows or columns were cut to keep rendering fast. */
  truncated: boolean;
}
