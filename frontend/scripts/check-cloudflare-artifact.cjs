const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

function checkArtifact(profile, { directory, offline = false } = {}) {
  if (!['staging', 'production'].includes(profile)) throw new Error('Unknown Cloudflare deployment profile.');
  const root = directory || path.resolve(profile === 'production' ? 'dist-production' : 'dist');
  const release = JSON.parse(fs.readFileSync(path.join(root, 'seo-release.json'), 'utf8'));
  if (release.cloudflare?.profile !== profile) throw new Error('Build profile mismatch: rebuild the intended Cloudflare artifact.');
  if (release.canonicalOrigin !== 'https://hard-quiz.com') throw new Error('Unexpected production canonical origin.');
  const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
  if (createHash('sha256').update(headers).digest('hex') !== release.cloudflare.headersSha256) {
    throw new Error('Artifact headers changed after preparation; rebuild before deploying.');
  }
  if (!offline && release.cloudflare.usesFixtureData) throw new Error('Fixture data must not be deployed to a real Cloudflare service.');
  if (!offline && profile === 'production' && !release.publicDocuments?.contactDetailsApproved) throw new Error('Owner-approved public contact details are required before production publication.');
  if (!offline && !/^[a-f0-9]{40}$/.test(release.revision || '')) throw new Error('Deployment requires an identified source revision.');
  return release;
}

if (require.main === module) {
  try {
    const profile = process.argv[2] || 'staging';
    checkArtifact(profile);
    console.log(`Cloudflare ${profile} artifact verified.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { checkArtifact };
