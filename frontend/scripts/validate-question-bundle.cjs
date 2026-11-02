const { readFile } = require("node:fs/promises");
const runtime = require("./bundle-runtime.cjs");
(async () => {
  const args = process.argv.slice(2),
    file = args[0];
  if (!file || file.startsWith("--"))
    throw Error(
      "Usage: npm run validate:question-bundle -- package.zip [--catalog catalog.json]",
    );
  const { validateBundle, decodeWebp, CURRENT_CATALOG } = await runtime();
  const at = args.indexOf("--catalog");
  const catalog =
    at >= 0
      ? JSON.parse(await readFile(args[at + 1], "utf8"))
      : CURRENT_CATALOG;
  const value = await validateBundle(
    new Uint8Array(await readFile(file)),
    catalog,
    { decode: decodeWebp },
  );
  const result = {
    package_id: value.packageId,
    manifest_sha256: value.manifestHash,
    catalog:
      at >= 0
        ? "provided snapshot"
        : "repository snapshot; UI always rechecks live settings",
    total: value.entries.length,
    valid: value.entries.filter((e) => !e.errors.length).length,
    errors: value.errors,
    records: value.entries.map((e) => ({
      temp_id: e.tempId,
      errors: e.errors,
      warnings: e.warnings,
    })),
  };
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (result.errors.length || result.valid !== result.total)
    process.exitCode = 1;
})().catch((error) => {
  process.stderr.write(error.message + "\n");
  process.exitCode = 1;
});
