// A provenance/file-identity gate, not a copyright or advertising-policy oracle.
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const origin = "https://hard-quiz.com";
const attributes = tag => Object.fromEntries([...tag.matchAll(/\b([a-z][a-z0-9-]*)="([^"]*)"/gi)].map(match => [match[1].toLowerCase(), match[2].replace(/&amp;/g, "&")]));
function assetPath(value) {
  const url = new URL(value, origin);
  if (url.origin !== origin || url.search || url.hash || !/^\/blog-assets\/[a-z0-9_./-]+\.(?:webp|svg)$/.test(url.pathname) || url.pathname.includes("..")) {
    throw new Error(`Blog image requires a registered local asset: ${value}`);
  }
  return url.pathname;
}

function createBlogImageRightsCheck({ root, publicDir, ledger }) {
  if (ledger.schemaVersion !== 1 || !ledger.assets || !Array.isArray(ledger.retiredPublicFiles)) throw new Error("Invalid blog image provenance ledger");
  const checked = new Set();
  const checkFile = (source, post, inline = false) => {
    const asset = assetPath(source), record = ledger.assets[asset];
    if (!record) throw new Error(`Unregistered blog image in ${post.slug}: ${asset}`);
    if (record.basis === "original_code_artwork") {
      if (!record.sourceCode || !fs.existsSync(path.join(root, record.sourceCode))) throw new Error(`Original artwork has no editable source: ${asset}`);
    } else if (["conditional_apple_promotion", "apple_store_badge"].includes(record.basis)) {
      if (!inline || record.article !== post.slug) throw new Error(`Promotional artwork is restricted to its corresponding inline film card: ${asset}`);
    } else throw new Error(`Unreviewed image rights basis: ${asset}`);
    if (!checked.has(asset)) {
      const file = path.join(publicDir, asset.slice(1));
      if (!fs.existsSync(file)) throw new Error(`Registered blog image is missing: ${asset}`);
      const actual = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
      if (!/^[a-f0-9]{64}$/.test(record.sha256 || "") || actual !== record.sha256) throw new Error(`Blog image differs from its reviewed bytes: ${asset}`);
      checked.add(asset);
    }
    return { asset, record };
  };
  for (const retired of ledger.retiredPublicFiles) {
    const asset = assetPath(retired);
    if (fs.existsSync(path.join(publicDir, asset.slice(1)))) throw new Error(`Retired imported image remains publishable: ${asset}`);
  }
  return {
    checkArticle(post, markup) {
      for (const source of [post.coverUrl, post.listingCoverUrl, post.socialImagePath, ...(post.gallery || [])].filter(Boolean)) checkFile(source, post);
      for (const tag of markup.match(/<img\b[^>]*>/gi) || []) {
        const attrs = attributes(tag);
        if (!attrs.src) throw new Error(`Blog image has no source in ${post.slug}`);
        const { asset, record } = checkFile(attrs.src, post, true);
        if (record.basis === "original_code_artwork" && !/original|illustration/i.test(attrs.alt || "")) throw new Error(`Original artwork needs a truthful alt: ${asset}`);
        if (record.basis === "conditional_apple_promotion") {
          const figure = (markup.match(/<figure\b[^>]*class="hq-store-poster"[^>]*>[\s\S]*?<\/figure>/g) || []).find(item => item.includes(`src="${asset}"`));
          const store = record.storeUrl?.replace(/&/g, "&amp;");
          if (!figure || !store || !figure.includes(`href="${store}"`) || !figure.includes('src="/blog-assets/itunes-store-get-badge.svg"')) throw new Error(`Promotional artwork needs its matching store link and approved badge: ${asset}`);
        }
        for (const item of (attrs.srcset || "").split(",").filter(Boolean)) checkFile(item.trim().split(/\s+/)[0], post, true);
      }
    },
    count: () => checked.size,
  };
}

module.exports = { createBlogImageRightsCheck, assetPath };
