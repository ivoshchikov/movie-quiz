import { processImage } from "./imageProcessing";
import type { ProcessedImage } from "./imageProcessing";

export function prepareImage(
  file: File,
  category: number,
  signal: AbortSignal,
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Cancelled", "AbortError"));
      return;
    }
    let worker: Worker;
    try {
      worker = new Worker(new URL("./image.worker.ts", import.meta.url), {
        type: "module",
      });
    } catch {
      file
        .arrayBuffer()
        .then((bytes) => processImage(bytes, category))
        .then(
          (value) =>
            signal.aborted
              ? reject(new DOMException("Cancelled", "AbortError"))
              : resolve(value),
          reject,
        );
      return;
    }
    let done = false;
    const finish = (error?: Error, value?: ProcessedImage) => {
      if (done) return;
      done = true;
      worker.terminate();
      signal.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(value!);
    };
    const abort = () => finish(new DOMException("Cancelled", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event) =>
      event.data.error
        ? finish(new Error(event.data.error))
        : finish(undefined, event.data.value);
    worker.onerror = () => {
      worker.terminate();
      file
        .arrayBuffer()
        .then((bytes) => processImage(bytes, category))
        .then(
          (value) => finish(undefined, value),
          () =>
            finish(
              new Error(
                "Image processing failed. Try another image or browser.",
              ),
            ),
        );
    };
    file.arrayBuffer().then(
      (bytes) => {
        if (!done) worker.postMessage({ bytes, category }, [bytes]);
      },
      (error) => finish(error),
    );
  });
}
