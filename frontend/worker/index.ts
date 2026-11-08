import legacyCards from '../.cache/og-legacy.json';
import { contentSecurityPolicy } from '../security-policy.json';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DEPLOYMENT_PROFILE?: string;
}

// Existing files bypass this Worker. It handles legacy OG URLs and real 404s only.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const headers = new Headers({ 'X-Robots-Tag': 'noindex, nofollow', 'Content-Security-Policy': contentSecurityPolicy });
    if (env.DEPLOYMENT_PROFILE === 'production') headers.set('Strict-Transport-Security', 'max-age=63072000');
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response(null, { status: 405, headers: { ...Object.fromEntries(headers), Allow: 'GET, HEAD' } });
    }
    const isPost = url.pathname === '/api/og/post';
    const isDaily = url.pathname === '/api/og/daily';
    if (isPost || isDaily) {
      const title = (url.searchParams.get('title') || '').slice(0, 120);
      const card = isDaily ? '/og/daily.png' : Object.hasOwn(legacyCards, title)
        ? legacyCards[title as keyof typeof legacyCards] : '/og/default.png';
      const asset = await env.ASSETS.fetch(new Request(new URL(card, url), { method: request.method }));
      const imageHeaders = new Headers(asset.headers);
      imageHeaders.set('Cache-Control', 'public, max-age=3600');
      for (const [name, value] of headers) imageHeaders.set(name, value);
      return new Response(asset.body, { status: asset.status, headers: imageHeaders });
    }
    const errorPage = url.pathname.startsWith('/blog/') ? '/blog/_not-found' : '/404';
    const asset = await env.ASSETS.fetch(new Request(new URL(errorPage, url), { method: request.method }));
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Cache-Control', 'no-store');
    return new Response(request.method === 'HEAD' ? null : asset.body, { status: 404, headers });
  },
};
