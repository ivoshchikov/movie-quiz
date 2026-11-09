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
