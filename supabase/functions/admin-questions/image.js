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

export function imageHeader(bytes, maxSide) {
  if (bytes.length < 20 || bytes.length > 1048576) throw new Error('WebP must be at most 1 MiB');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = at => String.fromCharCode(...bytes.subarray(at, at + 4));
  if (text(0) !== 'RIFF' || text(8) !== 'WEBP' || view.getUint32(4, true) + 8 !== bytes.length) throw new Error('Invalid WebP image');
  let dimensions, extended, bitstreams = 0;
  for (let at = 12; at < bytes.length;) {
    if (at + 8 > bytes.length) throw new Error('Invalid WebP image');
    const kind = text(at), size = view.getUint32(at + 4, true), data = at + 8;
    if (size > bytes.length - data || !['VP8X', 'VP8 ', 'VP8L', 'ALPH'].includes(kind)) throw new Error('Only static WebP without metadata is accepted');
    const three = p => bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16);
    if (kind === 'VP8X') {
      if (size !== 10 || extended || (bytes[data] & 0x2e)) throw new Error('Animated images or metadata are not accepted');
      extended = [three(data + 4) + 1, three(data + 7) + 1];
    } else if (kind === 'VP8 ') {
      if (size < 10 || bytes[data + 3] !== 0x9d || bytes[data + 4] !== 1 || bytes[data + 5] !== 0x2a) throw new Error('Invalid WebP image');
      dimensions = [view.getUint16(data + 6, true) & 0x3fff, view.getUint16(data + 8, true) & 0x3fff]; bitstreams++;
    } else if (kind === 'VP8L') {
      if (size < 5 || bytes[data] !== 0x2f) throw new Error('Invalid WebP image');
      const bits = view.getUint32(data + 1, true);
      dimensions = [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1]; bitstreams++;
    }
    at = data + size + (size & 1);
    if (at > bytes.length) throw new Error('Invalid WebP image');
  }
  if (bitstreams !== 1 || !dimensions || dimensions.some(n => n < 1 || n > maxSide) || dimensions[0] * dimensions[1] > maxSide * maxSide ||
    (extended && extended.some((n, i) => n !== dimensions[i]))) throw new Error('Image dimensions exceed this category’s limit');
  return { width: dimensions[0], height: dimensions[1] };
}

export async function sha256(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
}
