const { execFileSync } = require('node:child_process');

const fullSha = /^[a-f0-9]{40}$/;
const metadataNames = ['WORKERS_CI_COMMIT_SHA', 'VERCEL_GIT_COMMIT_SHA', 'VITE_VERCEL_GIT_COMMIT_SHA', 'GITHUB_SHA'];

function resolveBuildRevision({ env = process.env, cwd = process.cwd() } = {}) {
  const explicit = env.SEO_BUILD_REVISION?.trim();
  if (explicit) {
    if (!fullSha.test(explicit)) throw new Error('SEO_BUILD_REVISION must be a full Git SHA.');
    return explicit;
  }

  // A manual provider build can supply incomplete revision metadata. Read the
  // checked-out commit itself; never resolve a moving remote branch or invent
  // an identity by padding a shortened hash.
  try {
    const revision = execFileSync('git', ['rev-parse', '--verify', 'HEAD^{commit}'], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000,
    }).trim();
    if (fullSha.test(revision)) return revision;
  } catch { /* Source archives may legitimately omit Git metadata. */ }

  const metadata = metadataNames.map(name => env[name]?.trim()).filter(Boolean);
  const revision = metadata.find(value => fullSha.test(value));
  if (revision) return revision;
  if (metadata.length) throw new Error('No full Git SHA is available from the checkout or build metadata.');
  // Unidentified local/archive builds remain useful offline. Deploy guards
  // still reject them, and live publication checks require a full revision.
  return null;
}

module.exports = { resolveBuildRevision };
