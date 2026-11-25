export interface ThreadAccessBadgeProps {
  access: "read" | "write";
  className?: string;
  /** When set, the badge is a control that switches between read-only and writable. */
  disabled?: boolean;
  onToggle?: () => void;
}
