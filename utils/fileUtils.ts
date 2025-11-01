export const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // The result includes the "data:mime/type;base64," prefix.
      // The Gemini API needs the raw base64 string, so we split it.
      const base64Data = result.split(',')[1];
      if (base64Data) {
        resolve({ data: base64Data, mimeType: file.type });
      } else {
        reject(new Error("Failed to extract base64 data from file."));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};
