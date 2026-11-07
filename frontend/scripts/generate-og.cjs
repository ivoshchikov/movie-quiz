// Generate social cards once per build, using the existing renderer and fonts.
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const esbuild = require('esbuild');

(async () => {
  const root = process.cwd();
  const cache = path.join(root, '.cache');
  const dist = path.join(root, 'dist');
  const { posts } = require(path.join(cache, 'posts.cjs'));
  const renderer = path.join(cache, 'og-renderer.mjs');
  await esbuild.build({
    entryPoints: [path.join(root, 'api/og/post.tsx')], outfile: renderer,
    platform: 'node', format: 'esm', bundle: true, packages: 'external',
    jsx: 'automatic', logLevel: 'silent',
  });
  const { default: render } = await import(pathToFileURL(renderer).href);
  const cards = [
    { file: '/og/default.png', title: 'Hard Quiz — Guess Movies from Stills & Faces', tags: 'Play now,Daily Challenge' },
    { file: '/og/daily.png', title: 'Daily Challenge', tags: 'One new still every day,Hard Quiz' },
    ...posts.filter(post => !post.socialImagePath).map(post => ({
      file: `/og/posts/${post.slug}.png`, title: post.title, date: post.date,
    })),
  ];
  for (const { file, ...params } of cards) {
    const response = await render(new Request(`https://hard-quiz.com/api/og/post?${new URLSearchParams(params)}`));
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok || bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
      || bytes.readUInt32BE(16) !== 1200 || bytes.readUInt32BE(20) !== 630) {
      throw new Error(`Invalid generated social card: ${file}`);
    }
    await fs.mkdir(path.dirname(path.join(dist, file)), { recursive: true });
    await fs.writeFile(path.join(dist, file), bytes);
  }
  // Only previously published titles are mapped; arbitrary text is not rendered at runtime.
  const legacy = Object.fromEntries(posts.map(post => [post.title.slice(0, 120), post.socialImagePath || `/og/posts/${post.slug}.png`]));
  await fs.writeFile(path.join(cache, 'og-legacy.json'), JSON.stringify(legacy, null, 2) + '\n');
  console.log(`✓ Generated ${cards.length} social cards; retained ${posts.filter(post => post.socialImagePath).length} existing covers`);
})().catch(error => { console.error(error); process.exitCode = 1; });
