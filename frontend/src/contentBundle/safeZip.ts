import { Inflate } from "fflate";

export const ZIP_LIMITS = {
  compressed: 50 * 1048576,
  expanded: 64 * 1048576,
  entries: 500,
  file: 20 * 1048576,
  manifest: 2 * 1048576,
};
export function safeArchivePath(path: string) {
  return (
    path.length > 0 &&
    path.length <= 240 &&
    !path.startsWith("/") &&
    !/[\\:%]/.test(path) &&
    !Array.from(path).some(
      (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
    ) &&
    path
      .replace(/\/$/, "")
      .split("/")
      .every((p) => !!p && p !== "." && p !== "..")
  );
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes: Uint8Array) {
  let n = 0xffffffff;
  for (const b of bytes) n = crcTable[(n ^ b) & 255] ^ (n >>> 8);
  return (n ^ 0xffffffff) >>> 0;
}
// Inspect every directory entry before inflating, then bound ACTUAL output too.
// No paths are written to disk and no HTML, scripts or external references execute.
export async function readSafeZip(
  bytes: Uint8Array,
  progress?: (done: number, total: number) => void,
  signal?: AbortSignal,
) {
  if (bytes.length < 22 || bytes.length > ZIP_LIMITS.compressed)
    throw Error("ZIP must be at most 50 MiB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  for (; end >= Math.max(0, bytes.length - 65557); end--)
    if (
      view.getUint32(end, true) === 0x06054b50 &&
      end + 22 + view.getUint16(end + 20, true) === bytes.length
    )
      break;
  if (end < Math.max(0, bytes.length - 65557))
    throw Error("Invalid ZIP directory.");
  const count = view.getUint16(end + 10, true),
    directorySize = view.getUint32(end + 12, true),
    directory = view.getUint32(end + 16, true);
  if (
    view.getUint32(end + 4, true) !== 0 ||
    view.getUint16(end + 8, true) !== count ||
    count < 1 ||
    count > ZIP_LIMITS.entries ||
    directory + directorySize !== end
  )
    throw Error(
      "Use a single-volume ZIP with at most 500 files; ZIP64 is not supported.",
    );
  const names = new Set<string>();
  const entries: {
    name: string;
    packed: number;
    size: number;
    method: number;
    start: number;
    crc: number;
    offset: number;
  }[] = [];
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let at = directory,
    declared = 0;
  for (let i = 0; i < count; i++) {
    if (at + 46 > end || view.getUint32(at, true) !== 0x02014b50)
      throw Error("Invalid ZIP entry.");
    const flags = view.getUint16(at + 8, true),
      method = view.getUint16(at + 10, true),
      packed = view.getUint32(at + 20, true),
      size = view.getUint32(at + 24, true);
    const nameSize = view.getUint16(at + 28, true),
      extraSize = view.getUint16(at + 30, true),
      commentSize = view.getUint16(at + 32, true),
      offset = view.getUint32(at + 42, true);
    const next = at + 46 + nameSize + extraSize + commentSize;
    if (next > end) throw Error("Invalid ZIP entry length.");
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameSize));
    const folded = name.normalize("NFC").toLowerCase().replace(/\/$/, "");
    const unixType = (view.getUint32(at + 38, true) >>> 16) & 0xf000;
    if (
      !safeArchivePath(name) ||
      names.has(folded) ||
      (unixType && ![0x8000, 0x4000].includes(unixType))
    )
      throw Error(
        `Unsafe, duplicate or linked ZIP path: ${name.slice(0, 160)}`,
      );
    names.add(folded);
    if (
      !name.endsWith("/") &&
      (name.startsWith("images/")
        ? !name.endsWith(".webp")
        : !/\.(?:json|md|txt|html|xlsx)$/i.test(name))
    )
      throw Error(`Unsupported ZIP file type: ${name.slice(0, 160)}`);
    if (
      flags & ~0x080e ||
      flags & 1 ||
      ![0, 8].includes(method) ||
      view.getUint16(at + 34, true) !== 0
    )
      throw Error(
        "Encrypted files and unsupported ZIP methods are not accepted.",
      );
    if (
      size > ZIP_LIMITS.file ||
      (name === "manifest.json" && size > ZIP_LIMITS.manifest) ||
      (declared += size) > ZIP_LIMITS.expanded
    )
      throw Error("Unpacked ZIP exceeds the 64 MiB total or per-file limits.");
    if (
      offset + 30 > directory ||
      view.getUint32(offset, true) !== 0x04034b50 ||
      view.getUint16(offset + 6, true) !== flags ||
      view.getUint16(offset + 8, true) !== method
    )
      throw Error("Invalid ZIP local header.");
    const localNameSize = view.getUint16(offset + 26, true),
      localExtraSize = view.getUint16(offset + 28, true),
      start = offset + 30 + localNameSize + localExtraSize;
    if (
      start + packed > directory ||
      decoder.decode(
        bytes.subarray(offset + 30, offset + 30 + localNameSize),
      ) !== name
    )
      throw Error("ZIP entry paths or sizes disagree.");
    if (
      !(flags & 8) &&
      (view.getUint32(offset + 18, true) !== packed ||
        view.getUint32(offset + 22, true) !== size ||
        view.getUint32(offset + 14, true) !== view.getUint32(at + 16, true))
    )
      throw Error("ZIP entry headers disagree.");
    if (name.endsWith("/") && size !== 0)
      throw Error("Invalid ZIP directory contents.");
    entries.push({
      name,
      packed,
      size,
      method,
      start,
      offset,
      crc: view.getUint32(at + 16, true),
    });
    at = next;
  }
  if (at !== end) throw Error("Invalid ZIP directory size.");
  const ranges = [...entries].sort((a, b) => a.offset - b.offset);
  for (let i = 1; i < ranges.length; i++)
    if (ranges[i].offset < ranges[i - 1].start + ranges[i - 1].packed)
      throw Error("Overlapping ZIP entries are not accepted.");
  const files = new Map<string, Uint8Array>();
  let expanded = 0;
  for (const [i, e] of entries.entries()) {
    signal?.throwIfAborted();
    let actual = 0;
    const chunks: Uint8Array[] = [];
    const accept = (chunk: Uint8Array) => {
      actual += chunk.length;
      expanded += chunk.length;
      if (
        actual > e.size ||
        actual > ZIP_LIMITS.file ||
        expanded > ZIP_LIMITS.expanded
      )
        throw Error("Unpacked ZIP exceeded its declared size or safety limit.");
      chunks.push(chunk.slice());
    };
    if (e.method === 0) accept(bytes.subarray(e.start, e.start + e.packed));
    else {
      let finished = false;
      const inflater = new Inflate((chunk, final) => {
        accept(chunk);
        finished = final;
      });
      for (let n = 0; n < e.packed; n += 1024)
        inflater.push(
          bytes.subarray(e.start + n, e.start + Math.min(e.packed, n + 1024)),
          n + 1024 >= e.packed,
        );
      if (!finished) throw Error("Truncated compressed ZIP entry.");
    }
    if (actual !== e.size) throw Error(`Unpacked size mismatch: ${e.name}`);
    const data = new Uint8Array(actual);
    let cursor = 0;
    for (const chunk of chunks) {
      data.set(chunk, cursor);
      cursor += chunk.length;
    }
    if (crc32(data) !== e.crc) throw Error(`Damaged ZIP entry: ${e.name}`);
    if (!e.name.endsWith("/")) files.set(e.name, data);
    progress?.(i + 1, entries.length);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  if (!files.has("manifest.json"))
    throw Error("ZIP must contain manifest.json at its root.");
  return files;
}
