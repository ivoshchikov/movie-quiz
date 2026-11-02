const { build } = require("esbuild");
const path = require("node:path");
const { webcrypto } = require("node:crypto");
let ready;
module.exports = () =>
  (ready ??= (async () => {
    globalThis.crypto ??= webcrypto;
    const outfile = path.resolve(
      __dirname,
      "../.cache/question-content-bundle.cjs",
    );
    await build({
      stdin: {
        contents:
          'export * from "./src/contentBundle/validate.ts"; export * from "./src/contentBundle/safeZip.ts"; export * from "./src/admin/questionDrafts.ts"; export * from "../supabase/functions/admin-questions/image.js"; export * from "../supabase/functions/admin-questions/content.mjs";',
        resolveDir: path.resolve(__dirname, ".."),
      },
      bundle: true,
      platform: "node",
      format: "cjs",
      outfile,
      logLevel: "silent",
    });
    delete require.cache[outfile];
    return require(outfile);
  })());
