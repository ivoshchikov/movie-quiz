const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

const origin = 'http://127.0.0.1:8787';
const manifest = JSON.parse(fs.readFileSync('dist/seo-release.json', 'utf8'));
let server;
let logs = '';
const get = (url, options = {}) => fetch(origin + url, { redirect: 'manual', ...options });

before(async () => {
  server = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--local', '--ip', '127.0.0.1', '--port', '8787', '--inspector-port', '0', '--log-level', 'warn'], {
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
    assert.equal(html, fs.readFileSync(path.join('dist', entry.file), 'utf8'), entry.path);
    assert.ok(html.includes(`rel="canonical" href="https://hard-quiz.com${entry.path}"`), entry.path);
    if (manifest.revision) assert.ok(html.includes(`name="hardquiz:revision" content="${manifest.revision}"`));
  }
});

test('all legacy HTML URLs redirect permanently and retain query parameters', async () => {
  const files = fs.readdirSync('dist', { recursive: true }).filter(file => file.endsWith('.html') && !['404.html', 'blog/_not-found.html'].includes(file));
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

test('staging and version hosts carry noindex on ordinary static documents', async () => {
  for (const host of ['hard-quiz-staging.example.workers.dev', 'abc123-hard-quiz-staging.example.workers.dev']) {
    const response = await get('/blog', { headers: { Host: host } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/, host);
  }
});

test('unknown paths and direct error documents return 404 for crawlers and browser navigation', async () => {
  for (const url of ['/missing-migration-test', '/blog/missing-migration-test', '/blog/_not-found.html', '/blog/_not-found', '/404.html', '/404', '/api/missing', '/assets/missing.js']) {
    for (const headers of [{}, { 'Sec-Fetch-Mode': 'navigate' }]) {
      const response = await get(url, { headers });
      assert.equal(response.status, 404, url);
      assert.match(response.headers.get('x-robots-tag') || '', /noindex/, url);
      assert.match(response.headers.get('cache-control') || '', /no-store/, url);
      assert.match(await response.text(), url.startsWith('/blog/') ? /Article not found/ : /Page not found/);
    }
  }
});

test('all public social images have a successful image response', async () => {
  for (const entry of manifest.pages) {
    const html = fs.readFileSync(path.join('dist', entry.file), 'utf8');
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
    const expected = fs.readFileSync(path.join('dist', post.socialImagePath || `/og/posts/${post.slug}.png`));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected, post.slug);
  }
  for (const [url, file] of [['/api/og/post?title=Unknown%20title&reading=999', 'default.png'], ['/api/og/post', 'default.png'], ['/api/og/daily?d=2026-11-08', 'daily.png']]) {
    const response = await get(url);
    assert.equal(response.status, 200, url);
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), fs.readFileSync('dist/og/' + file));
    const head = await get(url, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal((await head.arrayBuffer()).byteLength, 0);
  }
});

test('robots, sitemap and feed remain static and source maps are excluded', async () => {
  for (const file of ['robots.txt', 'sitemap.xml', 'feed.xml', 'seo-release.json']) {
    const response = await get('/' + file);
    assert.equal(response.status, 200, file);
    assert.equal(await response.text(), fs.readFileSync('dist/' + file, 'utf8'));
  }
  const map = fs.readdirSync('dist/assets').find(file => file.endsWith('.map'));
  assert.ok(map);
  assert.equal((await get('/assets/' + map)).status, 404);
});
