export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read pasted image preview."));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Unable to read pasted image preview."));
    };
    reader.readAsDataURL(file);
  });
