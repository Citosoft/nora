export interface ComputerMenuProps {
  /** The computer whose chats are showing; it gets the checkmark. */
  currentRuntimeId: string;
  visible: boolean;
  onClose: () => void;
}
