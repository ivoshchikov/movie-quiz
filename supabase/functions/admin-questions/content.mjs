// Shared by the Edge Function, browser fingerprinting and package validator.
export const TEMP_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export function safeHttpUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || /\s/.test(value)) return false;
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !!u.hostname && !u.username && !u.password; } catch { return false; }
}
export async function bundleOperationId(packageId, tempId) {
  if (typeof packageId !== 'string' || typeof tempId !== 'string' || !TEMP_ID.test(packageId) || !TEMP_ID.test(tempId)) throw Error('Invalid bundle identity');
  // RFC 9562 UUIDv5, fixed Hard Quiz namespace; pair boundaries are unambiguous.
  const namespace = Uint8Array.from('6b2bff50debb51789b9b9dbe5a8c467b'.match(/../g), h => parseInt(h, 16));
  const name = new TextEncoder().encode(JSON.stringify([packageId, tempId]));
  const bytes = new Uint8Array(namespace.length + name.length); bytes.set(namespace); bytes.set(name, namespace.length);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', bytes)).slice(0, 16);
  digest[6] = (digest[6] & 15) | 0x50; digest[8] = (digest[8] & 63) | 0x80;
  const hex = Array.from(digest, n => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function validateContentMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || JSON.stringify(metadata).length > 32000) throw Error('Invalid image attribution');
  const image = metadata.image;
  if (!image || typeof image !== 'object' || Array.isArray(image)) throw Error('Invalid image attribution');
  for (const [key, max] of [['photographer',2000], ['license',200], ['attribution_text',12000]]) if (typeof image[key] !== 'string' || !image[key].trim() || image[key].length > max) throw Error('Invalid image attribution');
  for (const key of ['source_page_url', 'license_url']) if (!safeHttpUrl(image[key])) throw Error('Invalid image attribution URL');
  if (image.creator_urls !== undefined && (!Array.isArray(image.creator_urls) || image.creator_urls.length > 10 || !image.creator_urls.every(safeHttpUrl))) throw Error('Invalid creator URLs');
  if (typeof image.attribution_required !== 'boolean' || !image.processing || typeof image.processing.changes !== 'string' || !image.processing.changes.trim() || image.processing.changes.length > 4000) throw Error('Invalid image changes');
  for (const [key,max] of [['preferred_credit',2000],['derivative_license',200],['attribution_html',16000]]) if (image[key] !== undefined && (typeof image[key] !== 'string' || image[key].length > max)) throw Error('Invalid optional image attribution');
  if (image.share_alike_required !== undefined && typeof image.share_alike_required !== 'boolean') throw Error('Invalid derivative license');
  if (image.share_alike_required && (typeof image.derivative_license !== 'string' || !image.derivative_license.trim())) throw Error('Invalid derivative license');
  return canonical(metadata);
}
