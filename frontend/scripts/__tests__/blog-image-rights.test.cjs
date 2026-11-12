const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { createBlogImageRightsCheck } = require("../blog-image-rights.cjs");

function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hq-blog-provenance-"));
  try {
    const publicDir = path.join(root, "public"); fs.mkdirSync(path.join(publicDir, "blog-assets"), { recursive: true });
    fs.writeFileSync(path.join(root, "source.py"), "original drawing primitives");
    const bytes = Buffer.from("fixture image bytes"), src = "/blog-assets/original.webp";
    fs.writeFileSync(path.join(publicDir, src), bytes);
    const ledger = { schemaVersion: 1, assets: { [src]: { basis: "original_code_artwork", sourceCode: "source.py", sha256: createHash("sha256").update(bytes).digest("hex") } }, retiredPublicFiles: [] };
    const post = { slug: "fixture", coverUrl: src, gallery: [] };
    run({ root, publicDir, ledger, post, src, image: `<img src="${src}" alt="Original Hard Quiz illustration" width="10" height="10">` });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test("original local art with source and matching bytes passes", () => fixture(f => {
  const check = createBlogImageRightsCheck(f);check.checkArticle(f.post, f.image);assert.equal(check.count(), 1);
}));
test("an unregistered inline image fails even when the cover is approved", () => fixture(f => {
  assert.throws(() => createBlogImageRightsCheck(f).checkArticle(f.post, '<img src="/blog-assets/imported.webp">'), /Unregistered/);
}));
test("a remote fallback gallery cannot reintroduce an imported poster", () => fixture(f => {
  f.post.gallery = ["https://example.com/poster.webp"];assert.throws(() => createBlogImageRightsCheck(f).checkArticle(f.post, f.image), /registered local/);
}));
test("responsive variants must have their own reviewed provenance", () => fixture(f => {
  assert.throws(() => createBlogImageRightsCheck(f).checkArticle(f.post, f.image.replace(' alt=', ' srcset="/blog-assets/unreviewed.webp 200w" alt=')), /Unregistered/);
}));
test("changed or missing reviewed bytes stop publication", () => fixture(f => {
  fs.writeFileSync(path.join(f.publicDir, f.src), "replacement");assert.throws(() => createBlogImageRightsCheck(f).checkArticle(f.post, f.image), /reviewed bytes/);
  fs.unlinkSync(path.join(f.publicDir, f.src));assert.throws(() => createBlogImageRightsCheck(f).checkArticle(f.post, f.image), /missing/);
}));
test("an original-art label needs an editable source", () => fixture(f => {
  fs.unlinkSync(path.join(f.root, "source.py"));assert.throws(() => createBlogImageRightsCheck(f).checkArticle(f.post, f.image), /editable source/);
}));
test("retired images cannot remain in the deployable public directory", () => fixture(f => {
  f.ledger.retiredPublicFiles = [f.src];assert.throws(() => createBlogImageRightsCheck(f), /remains publishable/);
}));
test("an illustration cannot be described as a real film frame", () => fixture(f => {
  assert.throws(() => createBlogImageRightsCheck(f).checkArticle(f.post, f.image.replace("Original Hard Quiz illustration", "Actor in a scene from the film")), /truthful alt/);
}));
test("conditional store artwork cannot become a generic cover or gallery", () => fixture(f => {
  Object.assign(f.ledger.assets[f.src], { basis: "conditional_apple_promotion", article: "fixture" });
  assert.throws(() => createBlogImageRightsCheck(f).checkArticle(f.post, f.image), /restricted/);
}));
test("conditional inline store art needs a matching promotion card", () => fixture(f => {
  Object.assign(f.ledger.assets[f.src], { basis: "conditional_apple_promotion", article: "fixture", storeUrl: "https://itunes.apple.com/us/movie/fixture/id123" });
  delete f.post.coverUrl;assert.throws(() => createBlogImageRightsCheck(f).checkArticle(f.post, f.image), /matching store link/);
}));

function promotion(f) {
  const storeUrl = "https://itunes.apple.com/us/movie/fixture/id123?uo=4";
  Object.assign(f.ledger.assets[f.src], { basis: "conditional_apple_promotion", article: "fixture", storeUrl });
  delete f.post.coverUrl;
  const badge = "/blog-assets/itunes-store-get-badge.svg";
  const bytes = Buffer.from("approved badge fixture");
  fs.writeFileSync(path.join(f.publicDir, badge), bytes);
  f.ledger.assets[badge] = { basis: "apple_store_badge", articles: ["fixture"], sha256: createHash("sha256").update(bytes).digest("hex") };
  return `<figure class="hq-store-poster hq-film-poster"><a href="${storeUrl}">${f.image}</a><figcaption>Promotional store poster</figcaption><a class="hq-store-badge" href="${storeUrl}"><img src="${badge}" alt="Get it on iTunes"></a></figure>`;
}

test("a real poster card can combine layout classes and the matching approved store badge", () => fixture(f => {
  const markup = promotion(f); const check = createBlogImageRightsCheck(f);
  check.checkArticle(f.post, markup); assert.equal(check.count(), 2);
}));
test("a badge pointing at a different movie fails even if the poster link is correct", () => fixture(f => {
  const markup = promotion(f).replace('class="hq-store-badge" href="https://itunes.apple.com/us/movie/fixture/id123?uo=4"', 'class="hq-store-badge" href="https://itunes.apple.com/us/movie/another/id456"');
  assert.throws(() => createBlogImageRightsCheck(f).checkArticle(f.post, markup), /matching store link/);
}));
test("a poster pointing at a different movie fails even if the badge link is correct", () => fixture(f => {
  const markup = promotion(f).replace('<a href="https://itunes.apple.com/us/movie/fixture/id123?uo=4">', '<a href="https://itunes.apple.com/us/movie/another/id456">');
  assert.throws(() => createBlogImageRightsCheck(f).checkArticle(f.post, markup), /matching store link/);
}));

function ccFrame(f) {
  const sourcePage = "https://commons.wikimedia.org/wiki/File:Example.jpg";
  const licenseUrl = "https://creativecommons.org/licenses/by/3.0/";
  Object.assign(f.ledger.assets[f.src], { basis: "cc_by_3_0", article: "fixture", creator: "Example Creator", sourcePage, licenseUrl });
  delete f.post.coverUrl;
  return `<figure>${f.image.replace("Original Hard Quiz illustration", "Frame from the film")}<figcaption><a href="${sourcePage}">Film</a>, Example Creator, <a href="${licenseUrl}">CC BY 3.0</a>. Resized.</figcaption></figure>`;
}
test("a CC film frame with visible creator, source, license and processing credit passes", () => fixture(f => {
  createBlogImageRightsCheck(f).checkArticle(f.post, ccFrame(f));
}));
for (const [name, remove] of [["creator", "Example Creator, "], ["license link", '<a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>'], ["change credit", "Resized."]]) {
  test(`a CC film frame without its visible ${name} fails`, () => fixture(f => {
    const markup = ccFrame(f).replace(remove, "");
    assert.throws(() => createBlogImageRightsCheck(f).checkArticle(f.post, markup), /visible creator/);
  }));
}
test("a CC frame cannot silently become an uncredited cover or gallery fallback", () => fixture(f => {
  const markup = ccFrame(f); f.post.gallery = [f.src];
  assert.throws(() => createBlogImageRightsCheck(f).checkArticle(f.post, markup), /reviewed attribution/);
}));

test("CC0 photography requires its own reviewed source and visible CC0 link", () => fixture(f => {
  const previous = "https://creativecommons.org/licenses/by/3.0/";
  const licenseUrl = "https://creativecommons.org/publicdomain/zero/1.0/";
  const markup = ccFrame(f).replace("Frame from the film", "Photograph of a projector");
  Object.assign(f.ledger.assets[f.src], { basis: "cc0_1_0", licenseUrl });
  const reviewed = markup.replace(previous, licenseUrl).replace("CC BY 3.0", "CC0 1.0");
  createBlogImageRightsCheck(f).checkArticle(f.post, reviewed);
  assert.throws(() => createBlogImageRightsCheck(f).checkArticle(f.post, markup), /visible creator/);
}));
