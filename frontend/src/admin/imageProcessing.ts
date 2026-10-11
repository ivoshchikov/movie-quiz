import encode, { init } from "@jsquash/webp/encode.js";
import wasmUrl from "@jsquash/webp/codec/enc/webp_enc.wasm?url";
import wasmSimdUrl from "@jsquash/webp/codec/enc/webp_enc_simd.wasm?url";

export interface ProcessedImage {
  blob: Blob;
  sourceHash: string;
  sourceBytes: number;
  sourceWidth: number;
  sourceHeight: number;
  width: number;
  height: number;
}
let encoder: Promise<unknown> | undefined;
export const imageLimit = (category: number) =>
  category === 2 || category === 3 ? 1600 : 1920;
const hash = async (bytes: ArrayBuffer) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");

// Inspect dimensions before a browser allocates a potentially huge decoded bitmap.
function sourceInfo(bytes: Uint8Array): {
  width: number;
  height: number;
  mime: string;
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 24)
    throw new Error(
      "This file is not a supported image. Use JPEG, PNG or static WebP.",
    );
  if (
    bytes[0] === 137 &&
    String.fromCharCode(...bytes.subarray(1, 4)) === "PNG"
  ) {
    for (let at = 8; at + 12 <= bytes.length;) {
      const size = view.getUint32(at),
        kind = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
      if (size > bytes.length - at - 12)
        throw new Error("The PNG file is damaged.");
      if (kind === "acTL")
        throw new Error("Animated images are not supported.");
      at += size + 12;
    }
    return {
      width: view.getUint32(16),
      height: view.getUint32(20),
      mime: "image/png",
    };
  }
  if (
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    for (let at = 12; at + 8 <= bytes.length;) {
      const size = view.getUint32(at + 4, true),
        kind = String.fromCharCode(...bytes.subarray(at, at + 4)),
        data = at + 8;
      if (size > bytes.length - data)
        throw new Error("The WebP file is damaged.");
      if (
        kind === "ANIM" ||
        kind === "ANMF" ||
        (kind === "VP8X" && bytes[data] & 2)
      )
        throw new Error("Animated images are not supported.");
      at = data + size + (size & 1);
    }
    const kind = String.fromCharCode(...bytes.subarray(12, 16));
    if (kind === "VP8X")
      return {
        width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
        height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
        mime: "image/webp",
      };
    if (kind === "VP8 " && bytes.length >= 30)
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
        mime: "image/webp",
      };
    if (kind === "VP8L" && bytes.length >= 25) {
      const bits = view.getUint32(21, true);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
        mime: "image/webp",
      };
    }
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let at = 2; at + 4 < bytes.length;) {
      if (bytes[at] !== 0xff) throw new Error("The JPEG file is damaged.");
      while (bytes[at] === 0xff) at++;
      const marker = bytes[at++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const size = view.getUint16(at);
      if (size < 2 || at + size > bytes.length)
        throw new Error("The JPEG file is damaged.");
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker) &&
        size >= 8
      )
        return {
          height: view.getUint16(at + 3),
          width: view.getUint16(at + 5),
          mime: "image/jpeg",
        };
      at += size;
    }
  }
  throw new Error(
    "This file is not a supported image. Use JPEG, PNG or static WebP.",
  );
}

export async function processImage(
  bytes: ArrayBuffer,
  category: number,
): Promise<ProcessedImage> {
  if (bytes.byteLength > 20 * 1024 * 1024)
    throw new Error("The source image exceeds 20 MiB.");
  const info = sourceInfo(new Uint8Array(bytes));
  if (
    !Number.isInteger(info.width) ||
    !Number.isInteger(info.height) ||
    info.width < 1 ||
    info.height < 1 ||
    info.width * info.height > 24000000
  )
    throw new Error(
      "The source image exceeds 24 megapixels or has invalid dimensions.",
    );
  const sourceHash = await hash(bytes);
  const bitmap = await createImageBitmap(
    new Blob([bytes], { type: info.mime }),
    { imageOrientation: "from-image", colorSpaceConversion: "default" },
  );
  try {
    if (bitmap.width * bitmap.height > 24000000)
      throw new Error("The decoded image exceeds 24 megapixels.");
    const scale = Math.min(
      1,
      imageLimit(category) / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale)),
      height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement("canvas"), { width, height });
    const context = canvas.getContext("2d") as
      OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
    if (!context)
      throw new Error("Image processing is unavailable in this browser.");
    context.fillStyle = "#18191d";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    if (!encoder)
      encoder = init({
        locateFile: (path: string) =>
          path.includes("_simd") ? wasmSimdUrl : wasmUrl,
      }).catch((error) => {
        encoder = undefined;
        throw error;
      });
    await encoder;
    const encoded = await encode(context.getImageData(0, 0, width, height), {
      quality: 85,
      method: 4,
    });
    const blob = new Blob([encoded], { type: "image/webp" });
    if (blob.size > 1048576)
      throw new Error(
        "The processed image exceeds 1 MiB. Choose a smaller source image.",
      );
    return {
      blob,
      sourceHash,
      sourceBytes: bytes.byteLength,
      sourceWidth: bitmap.width,
      sourceHeight: bitmap.height,
      width,
      height,
    };
  } finally {
    bitmap.close();
  }
}
