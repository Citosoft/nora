export async function readComposerFile(uri: string): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error("This file could not be read. Choose it again.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("This file could not be read. Choose it again."));
    reader.onload = () => {
      const value = reader.result;
      if (typeof value !== "string" || !value.includes(";base64,")) reject(new Error("This file could not be read."));
      else resolve(value.slice(value.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}
