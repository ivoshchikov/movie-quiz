import { createClient } from 'npm:@supabase/supabase-js@2.52.0';
import { createHandler } from './handler.js';
import { decodeWebp } from './image.js';

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const fetchBounded: typeof fetch = (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) });
const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchBounded } });
const handler = createHandler({
  async authorize(request: Request) {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return null;
    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization }, fetch: fetchBounded } });
    const { data, error } = await client.auth.getUser(authorization.slice(7));
    if (error || data.user?.id !== '112743d7-f683-4bbb-8117-068e89a00f22') return null;
    const rights = await client.rpc('is_admin');
    return !rights.error && rights.data === true ? data.user.id : null;
  },
  async rpc(name: string, payload: Record<string, unknown>) {
    const { data, error } = await service.rpc(name, payload);
    if (error) throw new Error(error.message);
    return data;
  },
  storage: {
    async download(bucket: string, path: string) {
      const { data, error } = await service.storage.from(bucket).download(path);
      if (error) {
        if ('statusCode' in error && ['400','404'].includes(String(error.statusCode))) return null;
        throw new Error('Storage unavailable');
      }
      return new Uint8Array(await data.arrayBuffer());
    },
    async upload(bucket: string, path: string, bytes: Uint8Array, metadata: Record<string, string>) {
      const { error } = await service.storage.from(bucket).upload(path, bytes, { contentType: 'image/webp', cacheControl: '31536000', upsert: false, metadata });
      if (error) throw new Error('Storage upload interrupted');
    },
    async remove(bucket: string, path: string) {
      const { error } = await service.storage.from(bucket).remove([path]);
      if (error) throw new Error('Storage cleanup interrupted');
    },
  },
  decode: decodeWebp,
});
Deno.serve(handler);
