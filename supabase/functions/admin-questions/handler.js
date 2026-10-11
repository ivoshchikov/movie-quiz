import { imageHeader, sha256 } from './image.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
const origins = new Set(['https://hard-quiz.com', 'https://www.hard-quiz.com', 'http://localhost:5173']);
export function createHandler({ authorize, rpc, storage, decode }) {
  return async request => {
    const origin = request.headers.get('origin');
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
      ...(origins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (request.method === 'OPTIONS') return reply({}, origins.has(origin) ? 200 : 403);
    if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
    let owner, job, lease;
    try {
      owner = await authorize(request);
      if (!owner) return reply({ error: 'Administrator access required' }, 403);
      // Bound the actual streamed body, including chunked requests, before multipart parsing.
      const reader = request.body?.getReader();
      const parts = []; let length = 0;
      if (!reader) return reply({ error: 'Missing request body' }, 400);
      for (;;) {
        const part = await reader.read(); if (part.done) break;
        length += part.value.length;
        if (length > 1200000) { await reader.cancel(); return reply({ error: 'Upload exceeds 1 MiB' }, 413); }
        parts.push(part.value);
      }
      const body = new Uint8Array(length); let at = 0;
      for (const part of parts) { body.set(part, at); at += part.length; }
      const bounded = new Request(request.url, { method: 'POST', headers: request.headers, body });
      if (request.headers.get('content-type')?.startsWith('application/json')) {
        const action = await bounded.json();
        if (!action || typeof action !== 'object' || Array.isArray(action) || action.action !== 'cleanup') return reply({ error: 'Unknown operation' }, 400);
        const jobs = await rpc('admin_import_cleanup', { p_owner: owner });
        for (const item of jobs) {
          if (item.final_path) await storage.remove('movies', item.final_path);
          await storage.remove('question-staging', `${owner}/${item.id}.webp`);
          await rpc('admin_import_cleanup_ack', { p_owner: owner, p_id: item.id });
        }
        return reply({ cleaned: jobs.length });
      }
      const form = await bounded.formData();
      const file = form.get('image'); const raw = form.get('question');
      if (!(file instanceof Blob) || typeof raw !== 'string' || raw.length > 6000) return reply({ error: 'Image and answers are required' }, 400);
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data) || !UUID.test(data.id) || ![1,2,3,4].includes(data.category_id) || ![1,2,3].includes(data.difficulty_level_id) ||
        !Number.isInteger(data.correct_index) || data.correct_index < 0 || data.correct_index > 3 ||
        !Array.isArray(data.options) || data.options.length !== 4 || data.options.some(s => typeof s !== 'string') ||
        (data.source_hash != null && !HASH.test(data.source_hash))) return reply({ error: 'Invalid question settings' }, 400);
      const options = data.options.map(s => s.trim().normalize('NFC'));
      if (options.some(s => !s || s.length > 200 || s.includes('\ufffd') || /[\u0000-\u001f\u007f]/.test(s)) ||
        new Set(options.map(s => s.toLowerCase())).size !== 4) return reply({ error: 'Enter four different answers (1–200 characters each)' }, 400);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const expected = imageHeader(bytes, data.category_id === 2 || data.category_id === 3 ? 1600 : 1920);
      const actual = await decode(bytes);
      if (actual.width !== expected.width || actual.height !== expected.height) return reply({ error: 'Invalid image content' }, 400);
      const hash = await sha256(bytes);
      const fingerprint = await sha256(new TextEncoder().encode(JSON.stringify({ hash, category_id: data.category_id,
        difficulty_level_id: data.difficulty_level_id, options, correct_index: data.correct_index, source_hash: data.source_hash ?? null, ...(data.edit_question_id != null ? { edit_question_id: data.edit_question_id, edit_revision: data.edit_revision } : {}) })));
      if (data.edit_question_id != null && (!Number.isSafeInteger(data.edit_question_id) || data.edit_question_id < 1 || !Number.isSafeInteger(data.edit_revision) || data.edit_revision < 1)) return reply({ error: 'Invalid edit settings' }, 400);
      job = await rpc(data.edit_question_id != null ? 'admin_edit_import_reserve' : 'admin_import_reserve', { p_owner: owner, p_id: data.id, p_fingerprint: fingerprint, p_hash: hash,
        p_source_hash: data.source_hash ?? null, p_category: data.category_id, p_difficulty: data.difficulty_level_id,
        p_options: options, p_correct_index: data.correct_index, p_allow_duplicate: data.allow_duplicate === true,
        ...(data.edit_question_id != null ? { p_question_id: data.edit_question_id, p_revision: data.edit_revision } : {}) });
      if (job.status === 'duplicate') return reply(job, 409);
      if (job.status === 'committed') return reply({ status: 'committed', question_id: job.question_id, image_path: job.image_path });
      const claimed = await rpc('admin_import_claim', { p_owner: owner, p_id: data.id, p_fingerprint: fingerprint });
      if (claimed.status === 'busy') return reply({ status: 'busy' }, 409);
      if (claimed.status === 'committed') return reply({ status: 'committed', question_id: claimed.question_id, image_path: claimed.image_path });
      job = claimed; lease = job.lease_token;
      const stagingPath = `${owner}/${job.id}.webp`;
      const staged = await storage.download('question-staging', stagingPath);
      if (staged) { if (await sha256(staged) !== hash) throw new Error('Import data changed'); }
      else await storage.upload('question-staging', stagingPath, bytes, { hq_import_id: job.id, sha256: hash });
      for (let attempt = 0; attempt < 4; attempt++) {
        const existing = await rpc('admin_import_object', { p_owner: owner, p_path: job.image_path });
        if (existing && (existing.user_metadata?.hq_import_id !== job.id || existing.user_metadata?.sha256 !== hash)) {
          job.image_path = await rpc('admin_import_repath', { p_owner: owner, p_id: job.id, p_lease: lease }); continue;
        }
        if (!existing) {
          try { await storage.upload('movies', job.image_path, bytes, { hq_import_id: job.id, sha256: hash }); }
          catch {
            // A timeout may mean upload succeeded. Reconcile the same path before retrying.
            const saved = await rpc('admin_import_object', { p_owner: owner, p_path: job.image_path });
            if (!saved) throw new Error('Image upload interrupted. Retry this question.');
            if (saved.user_metadata?.hq_import_id !== job.id || saved.user_metadata?.sha256 !== hash) {
              job.image_path = await rpc('admin_import_repath', { p_owner: owner, p_id: job.id, p_lease: lease }); continue;
            }
          }
        }
        const confirmed = await storage.download('movies', job.image_path);
        if (!confirmed || await sha256(confirmed) !== hash) throw new Error('Image upload could not be confirmed');
        const result = await rpc('admin_import_finish', { p_owner: owner, p_id: job.id, p_lease: lease, p_fingerprint: fingerprint, p_hash: hash });
        // Cleanup failure must not turn a confirmed question into a failed import.
        try { await storage.remove('question-staging', stagingPath); await rpc('admin_import_cleanup_ack', { p_owner: owner, p_id: job.id }); } catch { /* Cleanup on a later administrator visit. */ }
        return reply(result);
      }
      throw new Error('Image name conflicted repeatedly. Retry this question.');
    } catch (error) {
      if (owner && job && lease) {
        try { await rpc('admin_import_release', { p_owner: owner, p_id: job.id, p_lease: lease }); } catch { /* Lease expires; the status API remains authoritative. */ }
      }
      const message = error instanceof Error ? error.message : '';
      if (error instanceof SyntaxError || error instanceof TypeError && /multipart|form.?data|parse/i.test(message)) return reply({ error: 'Invalid request body' }, 400);
      if (/Question changed|Question unavailable/i.test(message)) return reply({ error: message.slice(0,200), status: 'conflict' }, 409);
      if (/Administrator|auth|JWT|Account/i.test(message)) return reply({ error: 'Administrator access required' }, 403);
      if (/Invalid|dimensions|static WebP|metadata|Animated|WebP must|Decoding|different answers|Draft expired|data changed/i.test(message)) return reply({ error: message.slice(0,200) }, 400);
      return reply({ error: 'Saving could not be confirmed. Check status or retry this question.' }, 503);
    }
  };
}
