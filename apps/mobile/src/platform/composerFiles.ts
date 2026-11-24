import { File } from "expo-file-system";

export async function readComposerFile(uri: string): Promise<string> {
  return new File(uri).base64();
}
