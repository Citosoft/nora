export function titleFromInstruction(instruction: string): string {
  return instruction.trim().split(/\r?\n/).find((line) => line.trim())?.trim().slice(0, 200) || "New chat";
}
