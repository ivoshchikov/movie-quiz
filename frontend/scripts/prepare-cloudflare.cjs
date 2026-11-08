// Adapt the finished Vite/prerender build for the chosen Cloudflare profile.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { contactDetailsApproved, requireApprovedContact } = require('./public-contact.cjs');

async function prepare() {
  const profile = process.argv[2] || 'staging';
  if (!['staging', 'production'].includes(profile)) throw new Error('Choose staging or production explicitly.');
  const { loadEnv } = await import('vite');
  const publicEnv = loadEnv('production', process.cwd(), 'VITE_');
  const fixture = publicEnv.VITE_SUPABASE_URL === 'https://quiz-fixture.supabase.co';
  const contactDetails = JSON.parse(fs.readFileSync(path.resolve('src/publicSiteDetails.json'), 'utf8'));
  if (profile === 'production') {
    if (!fixture) requireApprovedContact(contactDetails);
    for (const name of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_BUCKET']) {
      if (!publicEnv[name]?.trim()) throw new Error(`Production build requires ${name}.`);
    }
    if (new URL(publicEnv.VITE_SUPABASE_URL).protocol !== 'https:') throw new Error('Production Supabase URL must use HTTPS.');
    const key = publicEnv.VITE_SUPABASE_ANON_KEY;
    if (!fixture && !key.startsWith('sb_publishable_')) {
      let role;
      try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch { /* reject below */ }
      if (role !== 'anon') throw new Error('Use the existing public Supabase key, never a server secret.');
    }
    const gaId = publicEnv.VITE_GA_ID || publicEnv.VITE_GA_MEASUREMENT_ID;
    if (!/^G-[A-Z0-9]+$/.test(gaId || '')) throw new Error('Production build requires the existing GA4 measurement ID.');
  }
  const dist = path.join(process.cwd(), profile === 'production' ? 'dist-production' : 'dist');
  if (profile === 'production') {
    fs.rmSync(dist, { recursive: true, force: true });
    fs.cpSync(path.join(process.cwd(), 'dist'), dist, { recursive: true });
  }
  const releasePath = path.join(dist, 'seo-release.json');
  const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
  if (release.canonicalOrigin !== 'https://hard-quiz.com' ||
      new URL(publicEnv.VITE_SITE_URL || 'https://hard-quiz.com').origin !== release.canonicalOrigin) {
    throw new Error('Cloudflare build must retain the production canonical origin.');
  }
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const files = fs.readdirSync(dist, { recursive: true }).filter(file => file.endsWith('.html'));
  const errors = new Set(['404.html', 'blog/_not-found.html']);
  const redirectLines = ['# Generated from the built HTML catalog. Keep query strings on redirects.'];
  const headerLines = [
    `# Generated for the ${profile} deployment. Do not reuse across profiles.`,
    '/*', ...(profile === 'staging'
      ? ['  X-Robots-Tag: noindex, nofollow']
      : ['  Strict-Transport-Security: max-age=63072000']),
  ];
  if (profile === 'production') {
    // Defensive exclusion if alternate URLs are ever enabled in the dashboard.
    headerLines.push('https://:worker.:account.workers.dev/*', '  X-Robots-Tag: noindex, nofollow');
  }
  for (const file of files) {
    const from = '/' + file.split(path.sep).join('/');
    if (errors.has(file)) continue;
    const to = file === 'index.html' ? '/' : from.slice(0, -5);
    const rule = config.routes.find(rule => !rule.has && rule.src && new RegExp(rule.src).test(from));
    if (rule?.status !== 301) throw new Error(`Missing legacy redirect for ${from}`);
    redirectLines.push(`${from} ${to} 301`);
    const served = config.routes.find(rule => !rule.has && rule.src && new RegExp(rule.src).test(to));
    if (served?.headers) {
      for (const url of [to, to === '/' ? to : to + '/', from]) {
        headerLines.push(url, ...Object.entries(served.headers).map(([key, value]) => `  ${key}: ${value}`));
      }
    }
  }
  // These routes have a robots meta tag already; make the HTTP response explicit too.
  for (const url of ['/login', '/setup-profile']) {
    for (const variant of [url, url + '/', url + '.html']) {
      headerLines.push(variant, '  X-Robots-Tag: noindex, nofollow', '  Cache-Control: no-store');
    }
  }
  fs.writeFileSync(path.join(dist, '_redirects'), redirectLines.join('\n') + '\n');
  const headers = headerLines.join('\n') + '\n';
  fs.writeFileSync(path.join(dist, '_headers'), headers);
  fs.writeFileSync(path.join(dist, '.assetsignore'), '**/*.map\n');
  release.publicDocuments = { contactDetailsApproved: contactDetailsApproved(contactDetails) };
  release.cloudflare = { profile, usesFixtureData: fixture || publicEnv.VITE_ANALYTICS_TEST_MODE === 'true',
    headersSha256: createHash('sha256').update(headers).digest('hex') };
  fs.writeFileSync(releasePath, JSON.stringify(release, null, 2) + '\n');
  console.log(`✓ Prepared Cloudflare ${profile}: ${redirectLines.length - 1} legacy redirects, private-route and alternate-host exclusions`);
}
prepare().catch(error => { console.error(error.message); process.exitCode = 1; });
