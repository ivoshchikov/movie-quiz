// A new import deliberately probes an object that does not exist yet. In the
// pinned SDK, download() wraps HTTP errors in StorageUnknownError.originalError
// (a Response); other versions expose status/statusCode on the error itself.
async function isMissingObject(error) {
  let detail = error;
  let status = Number(error?.status ?? error?.statusCode);
  if (error?.originalError instanceof Response) {
    status = error.originalError.status;
    if (status !== 400 && status !== 404) return false;
    try { detail = await error.originalError.clone().json(); }
    catch { return false; }
  }
  if (status !== 400 && status !== 404) return false;
  return detail?.code === 'NoSuchKey' || detail?.error === 'NoSuchKey' ||
    detail?.message === 'Object not found';
}

export function createStorageAdapter(storage) {
  return {
    async download(bucket, path) {
      const { data, error } = await storage.from(bucket).download(path);
      if (error) {
        if (await isMissingObject(error)) return null;
        // Authentication, missing buckets and real outages must stop the import.
        throw new Error('Storage unavailable');
      }
      return new Uint8Array(await data.arrayBuffer());
    },
    async upload(bucket, path, bytes, metadata) {
      const { error } = await storage.from(bucket).upload(path, bytes, {
        contentType: 'image/webp', cacheControl: '31536000', upsert: false, metadata,
      });
      if (error) throw new Error('Storage upload interrupted');
    },
    async remove(bucket, path) {
      const { error } = await storage.from(bucket).remove([path]);
      if (error) throw new Error('Storage cleanup interrupted');
    },
  };
}
