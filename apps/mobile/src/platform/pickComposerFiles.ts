import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { COMPOSER_ATTACHMENT_MAX_COUNT } from "@shared/composerAttachments";
import type { ComposerFileSource, PickedComposerFile } from "@/types/composerAttachments.types";

export async function pickComposerFiles(source: ComposerFileSource): Promise<PickedComposerFile[]> {
  if (source === "files") {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    return result.canceled ? [] : result.assets.map((asset) => ({ name: asset.name, uri: asset.uri, mimeType: asset.mimeType ?? "application/octet-stream", size: asset.size ?? null }));
  }
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("Allow camera access in your phone's settings to take a photo.");
  }
  const result = source === "camera"
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: COMPOSER_ATTACHMENT_MAX_COUNT, quality: 0.9 });
  return result.canceled ? [] : result.assets.map((asset, index) => ({ name: asset.fileName ?? `photo-${index + 1}.jpg`, uri: asset.uri,
    mimeType: asset.mimeType ?? "image/jpeg", size: asset.fileSize ?? null }));
}
