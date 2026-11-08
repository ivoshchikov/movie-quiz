const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { checkArtifact } = require('../check-cloudflare-artifact.cjs');

const origin = 'http://127.0.0.1:8787';
const profile = process.env.CLOUDFLARE_TEST_PROFILE || 'staging';
const production = profile === 'production';
const directory = production ? 'dist-production' : 'dist';
const manifest = checkArtifact(profile, { offline: true });
let server;
let logs = '';
const get = (url, options = {}) => fetch(origin + url, { redirect: 'manual', ...options });
// Node fetch replaces Host with the URL's host. Exercise absolute _headers rules
// with an actual HTTP Host instead of silently testing localhost a second time.
const getWithHost = (url, host) => new Promise((resolve, reject) => {
  require('node:http').get(origin + url, { headers: { Host: host } }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('error', reject);
    response.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: response.statusCode, headers: response.headers })));
  }).on('error', reject);
});

before(async () => {
  server = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--config', production ? 'wrangler.production.json' : 'wrangler.jsonc', '--local', '--ip', '127.0.0.1', '--port', '8787', '--inspector-port', '0', '--log-level', 'warn'], {
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', data => { logs += data; });
  server.stderr.on('data', data => { logs += data; });
  for (let attempt = 0; attempt < 150; attempt++) {
    try { if ((await get('/')).status === 200) return; } catch { /* wait for workerd */ }
    if (server.exitCode !== null) break;
    await delay(200);
  }
  throw new Error(`Cloudflare local runtime did not start:\n${logs}`);
}, { timeout: 35000 });

after(async () => {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([new Promise(resolve => server.once('exit', resolve)), delay(3000)]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
});

test('every public URL serves its prerendered content, production canonical and build identity', async () => {
  for (const entry of manifest.pages) {
    const response = await get(entry.path);
    assert.equal(response.status, 200, entry.path);
    const html = await response.text();
    assert.equal(html, fs.readFileSync(path.join(directory, entry.file), 'utf8'), entry.path);
    assert.equal(response.headers.get('x-robots-tag'), production ? null : 'noindex, nofollow', entry.path);
    if (production) assert.equal(response.headers.get('strict-transport-security'), 'max-age=63072000', entry.path);
    assert.ok(html.includes(`rel="canonical" href="https://hard-quiz.com${entry.path}"`), entry.path);
    if (manifest.revision) assert.ok(html.includes(`name="hardquiz:revision" content="${manifest.revision}"`));
    const head = html.split('</head>')[0];
    const verification = head.match(/<meta\b[^>]*name="google-adsense-account"[^>]*>/g) || [];
    assert.equal(verification.length, 1, entry.path);
    assert.match(verification[0], /content="ca-pub-7817531684692124"/, entry.path);
    assert.doesNotMatch(html, /<script\b[^>]*src=["'][^"']*(?:googlesyndication|doubleclick|adservice\.google)/i, entry.path);
  }
});

test('AdSense ads.txt is a plain-text root resource for crawlers and browser navigation', async () => {
  for (const headers of [{}, { 'Sec-Fetch-Mode': 'navigate' }]) {
    const response = await get('/ads.txt', { headers });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /^text\/plain\b/);
    assert.equal(await response.text(), 'google.com, pub-7817531684692124, DIRECT, f08c47fec0942fa0\n');
    if (production) assert.equal(response.headers.get('strict-transport-security'), 'max-age=63072000');
  }
  const head = await get('/ads.txt', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.match(head.headers.get('content-type') || '', /^text\/plain\b/);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
});

test('all legacy HTML URLs redirect permanently and retain query parameters', async () => {
  const files = fs.readdirSync(directory, { recursive: true }).filter(file => file.endsWith('.html') && !['404.html', 'blog/_not-found.html'].includes(file));
  for (const file of files) {
    const canonical = file === 'index.html' ? '/' : '/' + file.slice(0, -5);
    const response = await get('/' + file + '?utm_source=migration&topic=explainers');
    assert.equal(response.status, 301, file);
    const location = new URL(response.headers.get('location'), origin);
    assert.equal(location.pathname, canonical, file);
    assert.equal(location.searchParams.get('utm_source'), 'migration', file);
    assert.equal(location.searchParams.get('topic'), 'explainers', file);
  }
});

test('game, account and admin entry documents retain noindex and no-store', async () => {
  for (const url of ['/play', '/result', '/profile', '/time-attack/play', '/this-or-that/play', '/admin/daily', '/admin/questions', '/admin/questions/new', '/admin/question-statistics', '/login', '/setup-profile']) {
    const response = await get(url);
    assert.equal(response.status, 200, url);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/, url);
    assert.match(response.headers.get('cache-control') || '', /no-store/, url);
  }
});

test('alternate workers.dev hosts carry noindex while production canonical pages remain indexable', async () => {
  for (const host of ['hard-quiz.example.workers.dev', 'abc123-hard-quiz.example.workers.dev']) {
    const response = await getWithHost('/blog', host);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/, host);
  }
  const canonical = await getWithHost('/blog', 'hard-quiz.com');
  assert.equal(canonical.headers.get('x-robots-tag'), production ? null : 'noindex, nofollow');
});

test('unknown paths and direct error documents return 404 for crawlers and browser navigation', async () => {
  for (const url of ['/missing-migration-test', '/blog/missing-migration-test', '/blog/_not-found.html', '/blog/_not-found', '/404.html', '/404', '/api/missing', '/assets/missing.js']) {
    for (const headers of [{}, { 'Sec-Fetch-Mode': 'navigate' }]) {
      const response = await get(url, { headers });
      assert.equal(response.status, 404, url);
      assert.match(response.headers.get('x-robots-tag') || '', /noindex/, url);
      assert.match(response.headers.get('cache-control') || '', /no-store/, url);
      if (production) assert.equal(response.headers.get('strict-transport-security'), 'max-age=63072000', url);
      assert.match(await response.text(), url.startsWith('/blog/') ? /Article not found/ : /Page not found/);
    }
  }
});

test('all public social images have a successful image response', async () => {
  for (const entry of manifest.pages) {
    const html = fs.readFileSync(path.join(directory, entry.file), 'utf8');
    const image = html.match(/property="og:image" content="([^"]+)"/)?.[1];
    assert.ok(image, entry.path);
    const url = new URL(image.replaceAll('&amp;', '&'));
    const response = await get(url.pathname + url.search);
    assert.equal(response.status, 200, url.pathname);
    assert.match(response.headers.get('content-type') || '', /^image\//, url.pathname);
    assert.ok((await response.arrayBuffer()).byteLength > 1000, url.pathname);
  }
});

test('legacy social endpoints serve prebuilt cards, including navigation and unknown titles', async () => {
  const { posts } = require(path.resolve('.cache/posts.cjs'));
  for (const post of posts) {
    const response = await get('/api/og/post?' + new URLSearchParams({ title: post.title, date: post.date }), { headers: { 'Sec-Fetch-Mode': 'navigate' } });
    assert.equal(response.status, 200, post.slug);
    const expected = fs.readFileSync(path.join(directory, post.socialImagePath || `/og/posts/${post.slug}.png`));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected, post.slug);
  }
  for (const [url, file] of [['/api/og/post?title=Unknown%20title&reading=999', 'default.png'], ['/api/og/post', 'default.png'], ['/api/og/daily?d=2026-11-08', 'daily.png']]) {
    const response = await get(url);
    assert.equal(response.status, 200, url);
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), fs.readFileSync(path.join(directory, 'og', file)));
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
    if (production) assert.equal(response.headers.get('strict-transport-security'), 'max-age=63072000');
    const head = await get(url, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal((await head.arrayBuffer()).byteLength, 0);
  }
});

test('robots, sitemap and feed remain static and source maps are excluded', async () => {
  for (const file of ['robots.txt', 'sitemap.xml', 'feed.xml', 'seo-release.json']) {
    const response = await get('/' + file);
    assert.equal(response.status, 200, file);
    assert.equal(await response.text(), fs.readFileSync(path.join(directory, file), 'utf8'));
  }
  const map = fs.readdirSync(path.join(directory, 'assets')).find(file => file.endsWith('.map'));
  assert.ok(map);
  assert.equal((await get('/assets/' + map)).status, 404);
});

test('deployment guard rejects the wrong profile, fixture uploads and changed headers', () => {
  assert.throws(() => checkArtifact(production ? 'staging' : 'production', { directory, offline: true }), /profile mismatch/);
  if (manifest.cloudflare.usesFixtureData) assert.throws(() => checkArtifact(profile), /Fixture data/);
  const temporary = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'hardquiz-artifact-'));
  try {
    fs.copyFileSync(path.join(directory, 'seo-release.json'), path.join(temporary, 'seo-release.json'));
    fs.writeFileSync(path.join(temporary, '_headers'), '/*\n  X-Robots-Tag: noindex\n');
    assert.throws(() => checkArtifact(profile, { directory: temporary, offline: true }), /headers changed/);
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});

test('unsupported API methods cannot mutate data and retain production security headers', async () => {
  const response = await get('/api/og/post', { method: 'POST' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
  assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
  if (production) assert.equal(response.headers.get('strict-transport-security'), 'max-age=63072000');
});
