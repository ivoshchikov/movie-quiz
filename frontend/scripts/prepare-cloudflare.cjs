// Adapt the finished Vite/prerender build without changing the Vercel deployment.
const fs = require('node:fs');
const path = require('node:path');
const dist = path.join(process.cwd(), 'dist');
const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const files = fs.readdirSync(dist, { recursive: true }).filter(file => file.endsWith('.html'));
const errors = new Set(['404.html', 'blog/_not-found.html']);
const redirectLines = ['# Generated from the built HTML catalog. Keep query strings on redirects.'];
const headerLines = [
  '# Staging only. Production needs a separate reviewed deployment configuration.',
  '/*', '  X-Robots-Tag: noindex, nofollow',
];
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
  headerLines.push(url, '  X-Robots-Tag: noindex, nofollow', '  Cache-Control: no-store');
}
fs.writeFileSync(path.join(dist, '_redirects'), redirectLines.join('\n') + '\n');
fs.writeFileSync(path.join(dist, '_headers'), headerLines.join('\n') + '\n');
fs.writeFileSync(path.join(dist, '.assetsignore'), '**/*.map\n');
console.log(`✓ Prepared Cloudflare: ${redirectLines.length - 1} legacy redirects, private-route and preview headers`);
