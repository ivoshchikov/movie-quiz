const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { contactDetailsApproved, requireApprovedContact } = require('../public-contact.cjs');
const details = JSON.parse(fs.readFileSync('src/publicSiteDetails.json','utf8'));
const metadata = JSON.parse(fs.readFileSync('src/publicDocumentMetadata.json','utf8'));

test('public contact data cannot be treated as approved when a required field or approval is missing', () => {
  const fixture = { projectBrand: 'Fixture project', contactEmail: 'contact@example.invalid', contactDetailsApproved: true, controllerIdentityDisclosed: false };
  assert.equal(contactDetailsApproved(fixture), true);
  for (const input of [
    { ...fixture, projectBrand: '' }, { ...fixture, contactEmail: '' },
    { ...fixture, contactEmail: 'not-an-address' }, { ...fixture, contactEmail: 'contact@example.invalid\r\nBcc:other' },
    { ...fixture, contactDetailsApproved: false },
  ]) assert.throws(() => requireApprovedContact(input), /owner-approved/i);
});

test('public documents are readable in the first HTML response with a single canonical, metadata and footer', () => {
  const release = JSON.parse(fs.readFileSync('dist/seo-release.json','utf8'));
  const sitemap = fs.readFileSync('dist/sitemap.xml','utf8');
  for (const [name, page] of Object.entries(metadata)) {
    const html = fs.readFileSync(path.join('dist',`${name}.html`),'utf8');
    assert.ok(html.includes(`<h1>${page.heading}</h1>`), name);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, name);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1, name);
    assert.ok(html.includes(`rel="canonical" href="${page.url}"`), name);
    assert.ok(html.includes('name="robots" content="index, follow"'), name);
    assert.ok(html.includes('aria-label="Site information"'), name);
    for (const target of ['/about','/privacy','/contact']) assert.ok(html.includes(`href="${target}"`), name);
    assert.ok(html.includes(`"@type":"${page.jsonLd['@type']}"`), name);
    assert.ok(release.pages.some(row=>row.path===`/${name}`), name);
    assert.ok(sitemap.includes(`<loc>${page.url}</loc>`), name);
    if (!details.contactDetailsApproved) assert.doesNotMatch(html,/href="mailto:/,name);
    else {
      assert.ok(html.includes(`Hard Quiz is a ${details.projectBrand} project.`), name);
      assert.ok(html.includes(`>${details.contactEmail}</a>`), name);
      assert.ok(html.includes('For general enquiries and privacy requests, contact '), name);
      assert.doesNotMatch(html, /The site is operated by Sound Media|Sound Media (Ltd|Limited|LLC)/, name);
    }
  }
});

test('privacy text distinguishes current opt-out analytics, actual cleanup and advertising preparation', () => {
  const html = fs.readFileSync('dist/privacy.html','utf8');
  for (const wording of ['Optional analytics currently runs unless you turn it off', '35-day retention window', 'no automatic deletion simply because an account is inactive', 'Third-party advertising is not currently enabled']) assert.ok(html.includes(wording),wording);
  assert.ok(html.includes('href="/privacy?analytics=off#analytics-choices"'));
  assert.ok(html.includes('href="/privacy?analytics=on#analytics-choices"'));
  assert.doesNotMatch(html,/we only load analytics after your consent|all images are licensed|all images are public domain/i);
});

test('a real production artifact cannot pass the deployment check without approved contact details', () => {
  const { checkArtifact } = require('../check-cloudflare-artifact.cjs');
  const temporary = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'hardquiz-contact-'));
  try {
    const headers = '/*\n  Strict-Transport-Security: max-age=63072000\n';
    const release = {
      canonicalOrigin: 'https://hard-quiz.com', revision: 'a'.repeat(40),
      cloudflare: { profile: 'production', usesFixtureData: false,
        headersSha256: require('node:crypto').createHash('sha256').update(headers).digest('hex') },
      publicDocuments: { contactDetailsApproved: false },
    };
    fs.writeFileSync(path.join(temporary, '_headers'), headers);
    fs.writeFileSync(path.join(temporary, 'seo-release.json'), JSON.stringify(release));
    assert.throws(() => checkArtifact('production', { directory: temporary }), /Owner-approved public contact details/);
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});
