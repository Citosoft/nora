export interface DiffAnnotationLineTarget {
  path: string;
  oldLine: number | null;
  newLine: number | null;
  lineText: string;
}

export interface DiffAnnotation {
  id: string;
  target: DiffAnnotationLineTarget;
  body: string;
  createdAt: string;
}
