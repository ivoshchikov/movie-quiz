import factory from './vendor/webp_dec.js';
import wasm from './vendor/webp_wasm.js';

let decoder;
export async function decodeWebp(bytes) {
  if (!decoder) {
    if (!globalThis.ImageData) globalThis.ImageData = class ImageData {
      constructor(data, width, height) { this.data = data; this.width = width; this.height = height; }
    };
    decoder = (async () => {
      const module = await WebAssembly.compile(Uint8Array.from(atob(wasm), c => c.charCodeAt(0)));
      return factory({ noInitialRun: true, instantiateWasm(imports, callback) {
        const instance = new WebAssembly.Instance(module, imports); callback(instance); return instance.exports;
      } });
    })();
  }
  const image = (await decoder).decode(bytes);
  if (!image || image.data.length !== image.width * image.height * 4) throw new Error('Invalid image');
  return { width: image.width, height: image.height };
}

export { imageHeader, sha256 } from './webpHeader.mjs';
