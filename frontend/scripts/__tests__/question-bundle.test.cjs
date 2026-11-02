const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFile } = require("node:fs/promises");
const { zipSync, strToU8 } = require("fflate");
const runtime = require("../bundle-runtime.cjs");
const path = require("node:path");
const root = path.resolve(
  __dirname,
  "../../../docs/examples/question-content-bundle",
);
async function bundle(change = () => {}, extra = {}) {
  const manifest = JSON.parse(
    await readFile(path.join(root, "manifest.json"), "utf8"),
  );
  const files = Object.fromEntries(
    await Promise.all(
      manifest.questions.map(async (q) => [
        q.image.file,
        new Uint8Array(await readFile(path.join(root, q.image.file))),
      ]),
    ),
  );
  change(manifest, files);
  return zipSync({
    ...files,
    ...extra,
    "manifest.json": strToU8(JSON.stringify(manifest)),
  });
}
async function validate(bytes) {
  const r = await runtime();
  return r.validateBundle(bytes, r.CURRENT_CATALOG, { decode: r.decodeWebp });
}
test("the documented example covers all four live category IDs and preserves prepared WebP bytes", async () => {
  const r = await runtime(),
    value = await validate(await bundle());
  assert.deepEqual(value.errors, []);
  assert.deepEqual(
    value.entries.map((e) => e.errors),
    [[], [], [], []],
  );
  assert.deepEqual(
    value.entries.map((e) => e.question.category_id),
    [1, 2, 3, 4],
  );
  for (const e of value.entries)
    assert.equal(
      await r.sha256(value.files.get(e.question.image.file)),
      e.question.image.sha256,
    );
});
test("50 records, false legacy compatibility flag and zero-based answer positions are accepted", async () => {
  const value = await validate(
    await bundle((m) => {
      m.supported_by_current_admin_importer = false;
      const sample = m.questions[0];
      m.questions = Array.from({ length: 50 }, (_, i) => ({
        ...sample,
        temp_id: `sample-${i}`,
        correct_index: i % 4,
        correct_answer: sample.options[i % 4],
        correct_option_label: "ABCD"[i % 4],
      }));
      m.question_count = 50;
    }),
  );
  assert.equal(value.entries.length, 50);
  assert.ok(value.entries.every((e) => !e.errors.length));
});
test(
  "the attached acceptance package passes the same validator and full server decoder when provided",
  { skip: !process.env.HQ_BUNDLE_ACCEPTANCE_ZIP },
  async () => {
    const value = await validate(
      new Uint8Array(await readFile(process.env.HQ_BUNDLE_ACCEPTANCE_ZIP)),
    );
    assert.equal(value.entries.length, 50);
    assert.equal(value.packageId, "HQA-20261102-v1");
    assert.deepEqual(value.errors, []);
    assert.ok(
      value.entries.every(
        (e) => !e.errors.length && e.question.category_id === 3,
      ),
    );
  },
);
test("schema version, count, production IDs and live catalog are checked without changing settings", async () => {
  await assert.rejects(
    validate(
      await bundle((m) => {
        m.schema_version = "future/99";
      }),
    ),
    /Invalid manifest/,
  );
  await assert.rejects(
    validate(
      await bundle((m) => {
        m.questions = [];
        m.question_count = 0;
      }),
    ),
    /Invalid manifest/,
  );
  assert.match(
    (
      await validate(
        await bundle((m) => {
          m.question_count = 3;
        }),
      )
    ).errors.join(),
    /question_count/,
  );
  assert.ok(
    (
      await validate(
        await bundle((m) => {
          m.questions[0].question_id = 123;
        }),
      )
    ).entries[0].errors.length,
  );
  assert.ok(
    (
      await validate(
        await bundle((m) => {
          m.questions[0].difficulty_key = "easy-ish";
        }),
      )
    ).entries[0].errors.length,
  );
  assert.ok(
    (
      await validate(
        await bundle((m) => {
          m.category = { id: 1, name: "Actors" };
        }),
      )
    ).errors.length,
  );
});
test("repeated temporary IDs invalidate both entries, while possible persons/works and image duplicates only warn", async () => {
  const repeated = await validate(
    await bundle((m) => {
      m.questions[1].temp_id = m.questions[0].temp_id;
    }),
  );
  assert.ok(
    repeated.entries
      .slice(0, 2)
      .every((e) => e.errors.some((s) => /repeated/.test(s))),
  );
  const intentional = await validate(
    await bundle((m) => {
      m.questions[1] = { ...m.questions[0], temp_id: "different-frame" };
    }),
  );
  assert.equal(intentional.entries.length, 4);
  assert.equal(intentional.entries[1].errors.length, 0);
  assert.equal(intentional.entries[1].warnings.length, 2);
});
test("four distinct answers, index, extra label and option entity identities must agree", async () => {
  for (const change of [
    (q) => {
      q.options[1] = "  " + q.options[0].toUpperCase();
    },
    (q) => {
      q.correct_index = 1;
    },
    (q) => {
      q.correct_option_label = "D";
    },
    (q) => {
      q.options[1] = "  ";
    },
    (q) => {
      q.correct_index = 4;
    },
    (q) => {
      q.options[1] = "\u0000bad";
    },
    (q) => {
      q.correct_option = "B";
    },
    (q) => {
      q.option_entities = q.options.map((name) => ({
        name,
        wikidata_id: "Q1",
      }));
    },
  ])
    assert.ok(
      (await validate(await bundle((m) => change(m.questions[0])))).entries[0]
        .errors.length,
    );
});
test("missing images, false hashes/sizes/dimensions, invalid bytes, animation/metadata and unsafe attribution URLs are rejected per record", async () => {
  for (const change of [
    (q, f) => {
      delete f[q.image.file];
    },
    (q) => {
      q.image.sha256 = "a".repeat(64);
    },
    (q) => {
      q.image.bytes++;
    },
    (q) => {
      q.image.width++;
    },
    (q) => {
      q.image.license_url = "javascript:alert(1)";
    },
    (q) => {
      q.image.source_page_url = "https://user:password@example.com";
    },
    (q) => {
      q.image.share_alike_required = true;
      delete q.image.derivative_license;
    },
  ])
    assert.ok(
      (await validate(await bundle((m, f) => change(m.questions[0], f))))
        .entries[0].errors.length,
    );
  const r = await runtime();
  const value = await validate(
    await bundle((m, f) => {
      const q = m.questions[0];
      f[q.image.file] = new Uint8Array(q.image.bytes);
    }),
  );
  assert.ok(value.entries[0].errors.length);
  assert.throws(() => r.imageHeader(new Uint8Array(24), 1600), /WebP/);
});
test("attribution is retained as data including HTML; URLs can never use executable schemes", async () => {
  const value = await validate(
    await bundle((m) => {
      m.questions[0].image.attribution_html = '<img src=x onerror="alert(1)">';
    }),
  );
  const r = await runtime(),
    metadata = r.questionMetadata(
      value.entries[0].question,
      value.manifestHash,
    );
  assert.match(metadata.image.attribution_html, /onerror/);
  assert.equal(metadata.editorial.manifest_sha256, value.manifestHash);
  assert.equal(r.safeHttpUrl("javascript:alert(1)"), false);
  assert.equal(r.safeHttpUrl("data:text/html,test"), false);
});
test("unsafe/duplicate normalized paths, symlinks, encryption, oversized directories and damaged CRC fail closed", async () => {
  for (const name of [
    "../evil.txt",
    "/absolute.txt",
    "a/../evil.txt",
    "a\\evil.txt",
    "a/%2e%2e/file",
    "a//file",
    "C:/file",
  ])
    await assert.rejects(
      validate(await bundle(() => {}, { [name]: strToU8("bad") })),
      /Unsafe/,
    );
  await assert.rejects(
    validate(await bundle(() => {}, { "MANIFEST.JSON": strToU8("bad") })),
    /duplicate/,
  );
  const r = await runtime();
  for (const mutation of [
    (b, v, at) => v.setUint32(at + 38, 0xa0000000, true),
    (b, v, at) => v.setUint16(at + 8, 1, true),
    (b, v, at) => v.setUint32(at + 16, 9, true),
    (b, v, at) => v.setUint32(at + 24, 21 * 1048576, true),
  ]) {
    const bytes = await bundle(),
      view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      at = view.getUint32(bytes.length - 6, true);
    mutation(bytes, view, at);
    await assert.rejects(r.readSafeZip(bytes));
  }
  const many = zipSync(
    Object.fromEntries(
      Array.from({ length: 501 }, (_, i) => [`file-${i}.txt`, strToU8("x")]),
    ),
  );
  await assert.rejects(r.readSafeZip(many), /500/);
});
test("actual inflated size is bounded even if both ZIP headers under-report a compression bomb", async () => {
  const r = await runtime(),
    bytes = zipSync({ "manifest.json": new Uint8Array(2 * 1048576) });
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    directory = view.getUint32(bytes.length - 6, true);
  view.setUint32(22, 1, true);
  view.setUint32(directory + 24, 1, true);
  await assert.rejects(r.readSafeZip(bytes), /declared size|safety limit/);
});
test("package/temp pairs have stable distinct UUIDv5 IDs and metadata ordering cannot change a fingerprint", async () => {
  const r = await runtime(),
    id = await r.bundleOperationId("package-A", "record-A");
  assert.match(id, /^[0-9a-f-]{14}5/);
  assert.equal(id, await r.bundleOperationId("package-A", "record-A"));
  assert.notEqual(id, await r.bundleOperationId("package-B", "record-A"));
  assert.notEqual(
    await r.bundleOperationId("ab", "c"),
    await r.bundleOperationId("a", "bc"),
  );
  assert.equal(
    JSON.stringify(r.canonical({ b: 2, a: { d: 1, c: 3 } })),
    JSON.stringify(r.canonical({ a: { c: 3, d: 1 }, b: 2 })),
  );
});
test("draft capacity counts encoded blobs and attribution, including existing cards", async () => {
  const r = await runtime();
  const card = {
    id: "draft",
    createdAt: Date.now(),
    category: 3,
    difficulty: 1,
    options: ["A", "B", "C", "D"],
    correct: 0,
    phase: "Ready",
    locked: false,
    processed: {
      blob: new Blob([new Uint8Array(800000)]),
      sourceHash: "a".repeat(64),
      sourceBytes: 800000,
      width: 100,
      height: 100,
    },
  };
  assert.ok(
    r.draftStorageBytes(Array.from({ length: 49 }, () => card)) < 50 * 1048576,
  );
  assert.ok(
    r.draftStorageBytes(Array.from({ length: 50 }, () => card)) > 50 * 1048576,
  );
  assert.ok(
    r.draftStorageBytes([
      {
        ...card,
        contentMetadata: { image: { attribution_text: "X".repeat(12000) } },
      },
    ]) >
      r.draftStorageBytes([card]) + 11000,
  );
  assert.equal(
    r.draftStorageBytes([{ ...card, phase: "Added", questionId: 1 }]),
    1000,
  );
});
