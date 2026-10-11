import { processImage } from "./imageProcessing";
self.onmessage = async (event) => {
  try {
    const value = await processImage(event.data.bytes, event.data.category);
    self.postMessage({ value });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "Image processing failed.",
    });
  }
};
