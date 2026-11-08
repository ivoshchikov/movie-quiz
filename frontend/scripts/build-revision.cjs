const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const fullSha = /^[a-f0-9]{40}$/;
const metadataNames = ['WORKERS_CI_COMMIT_SHA', 'VERCEL_GIT_COMMIT_SHA', 'VITE_VERCEL_GIT_COMMIT_SHA', 'GITHUB_SHA'];

function checkoutRoot(cwd) {
  let directory = fs.realpathSync(cwd);
  while (!fs.existsSync(path.join(directory, '.git'))) {
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
  return directory;
}

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
    const root = checkoutRoot(cwd);
    // CI containers can run as a different UID from checkout. Trust only this
    // detected checkout for this read; do not edit global config or use '*'.
    const revision = root && execFileSync('git', ['-c', `safe.directory=${root}`, 'rev-parse', '--verify', 'HEAD^{commit}'], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000,
    }).trim();
    if (revision && fullSha.test(revision)) return revision;
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
