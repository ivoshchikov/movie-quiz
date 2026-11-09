// A provenance/file-identity gate, not a copyright or advertising-policy oracle.
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const origin = "https://hard-quiz.com";
const attributes = tag => Object.fromEntries([...tag.matchAll(/\b([a-z][a-z0-9-]*)="([^"]*)"/gi)].map(match => [match[1].toLowerCase(), match[2].replace(/&amp;/g, "&")]));
const hasClass = (tag, name) => (attributes(tag).class || "").split(/\s+/).includes(name);
const openingTag = markup => markup.slice(0, markup.indexOf(">") + 1);
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
      if (!inline || !(record.articles || [record.article]).includes(post.slug)) throw new Error(`Promotional artwork is restricted to its corresponding inline film card: ${asset}`);
    } else if (record.basis === "cc_by_3_0") {
      if (!inline || record.article !== post.slug || !record.creator || record.licenseUrl !== "https://creativecommons.org/licenses/by/3.0/" || !record.sourcePage?.startsWith("https://commons.wikimedia.org/wiki/File:")) throw new Error(`CC film frame needs reviewed attribution and its corresponding article: ${asset}`);
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
    if (fs.existsSync(path.join(publicDir, asset.slice(1)))) throw new Error(`Retired blog image remains publishable: ${asset}`);
  }
  return {
    checkArticle(post, markup) {
      const figures = markup.match(/<figure\b[^>]*>[\s\S]*?<\/figure>/g) || [];
      for (const source of [post.coverUrl, post.listingCoverUrl, post.socialImagePath, ...(post.gallery || [])].filter(Boolean)) checkFile(source, post);
      for (const tag of markup.match(/<img\b[^>]*>/gi) || []) {
        const attrs = attributes(tag);
        if (!attrs.src) throw new Error(`Blog image has no source in ${post.slug}`);
        const { asset, record } = checkFile(attrs.src, post, true);
        if (record.basis === "original_code_artwork" && !/original|illustration/i.test(attrs.alt || "")) throw new Error(`Original artwork needs a truthful alt: ${asset}`);
        if (record.basis === "conditional_apple_promotion") {
          const figure = figures.find(item => hasClass(openingTag(item), "hq-store-poster") && item.includes(`src="${asset}"`));
          const anchors = figure?.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) || [];
          const posterLink = anchors.find(item => item.includes(`src="${asset}"`));
          const badgeLink = anchors.find(item => hasClass(openingTag(item), "hq-store-badge") && item.includes('src="/blog-assets/itunes-store-get-badge.svg"'));
          if (!record.storeUrl || attributes(openingTag(posterLink || "")).href !== record.storeUrl || attributes(openingTag(badgeLink || "")).href !== record.storeUrl) throw new Error(`Promotional artwork needs its matching store link and approved badge: ${asset}`);
        }
        if (record.basis === "cc_by_3_0") {
          const figure = figures.find(item => item.includes(`src="${asset}"`));
          const caption = figure?.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/)?.[1];
          const links = (caption?.match(/<a\b[^>]*>/g) || []).map(tag => attributes(tag).href);
          if (!caption?.includes(record.creator) || !links.includes(record.sourcePage) || !links.includes(record.licenseUrl) || !/resized|crop|compress/i.test(caption)) throw new Error(`CC film frame needs visible creator, source, license and change credit: ${asset}`);
        }
        for (const item of (attrs.srcset || "").split(",").filter(Boolean)) checkFile(item.trim().split(/\s+/)[0], post, true);
      }
    },
    count: () => checked.size,
  };
}

module.exports = { createBlogImageRightsCheck, assetPath };
