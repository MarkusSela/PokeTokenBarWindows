const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PokeApi, loadShippedCatalog, loadShippedCatalogDocument } = require('../core/pokeapi.cjs');
const { normalizeState } = require('../core/game.cjs');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'assets', 'pokemon-catalog.json');
const statePath = path.join(root, 'test', 'fixtures', 'state-sprite-style-v2.json');

function temporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ptb-catalog-runtime-'));
}

async function withFetch(fetchImpl, callback) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try { return await callback(); } finally { globalThis.fetch = previous; }
}

function response(value) {
  return { ok: true, status: 200, json: async () => value };
}

const networkForbidden = async (url) => {
  throw new Error(`network forbidden: ${url}`);
};

test('loadShippedCatalog exposes v2 document and keeps the legacy line-array API', () => {
  const document = loadShippedCatalogDocument();
  assert.equal(document.schemaVersion, 2);
  assert.equal(typeof document.catalogVersion, 'string');
  assert.ok(document.lines.length >= 540);
  assert.ok(Object.keys(document.species).length >= 1025);
  assert.ok(Object.keys(document.variants).length >= 1025);
  const rows = loadShippedCatalog();
  assert.deepEqual(rows, document.lines);
  assert.ok(rows.some((row) => row.id === 56 && row.line.pathOptions.some((pathIds) => pathIds.includes(979))));
  assert.equal(rows.some((row) => row.id === 132), false);
});

test('baseIndex uses the shipped v2 catalog and versioned cache without network', async () => {
  const directory = temporaryDirectory();
  try {
    await withFetch(networkForbidden, async () => {
      const api = new PokeApi(directory);
      const index = await api.baseIndex();
      assert.equal(index.length, 540);
      assert.ok(index.some((row) => row.id === 56 && row.line.pathOptions.some((pathIds) => pathIds.includes(979))));
      assert.equal(index.some((row) => row.id === 132), false);
      const cache = JSON.parse(fs.readFileSync(path.join(directory, 'base-index.json'), 'utf8'));
      const document = loadShippedCatalogDocument();
      assert.equal(cache.schemaVersion, 2);
      assert.equal(cache.catalogVersion, document.catalogVersion);
      assert.deepEqual(cache.value, index);
    });
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('a fresh but mismatched cache is ignored instead of hiding modern lines', async () => {
  const directory = temporaryDirectory();
  try {
    fs.writeFileSync(path.join(directory, 'base-index.json'), JSON.stringify({
      fetchedAt: Date.now(),
      schemaVersion: 2,
      catalogVersion: 'old-catalog-version',
      value: [{ id: 1, captureRate: 1, line: { baseId: 1, pathIds: [1] } }],
    }));
    await withFetch(networkForbidden, async () => {
      const index = await new PokeApi(directory).baseIndex();
      assert.equal(index.length, 540);
      assert.ok(index.some((row) => row.id === 979 || row.line?.pathOptions?.some((pathIds) => pathIds.includes(979))));
    });
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('corrupt and non-writable cache paths fall back to the included catalog', async () => {
  const corruptDirectory = temporaryDirectory();
  const blockedParent = path.join(corruptDirectory, 'cache-file');
  try {
    fs.writeFileSync(path.join(corruptDirectory, 'base-index.json'), '{not json');
    fs.writeFileSync(blockedParent, 'not a directory');
    await withFetch(networkForbidden, async () => {
      assert.equal((await new PokeApi(corruptDirectory).baseIndex()).length, 540);
      assert.equal((await new PokeApi(blockedParent).baseIndex()).length, 540);
    });
  } finally { fs.rmSync(corruptDirectory, { recursive: true, force: true }); }
});

test('a shipped line is resolved locally even when every network call throws', async () => {
  const directory = temporaryDirectory();
  try {
    await withFetch(networkForbidden, async () => {
      const line = await new PokeApi(directory).line(56);
      assert.ok(line.pathOptions.some((pathIds) => pathIds.includes(979)));
    });
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('missing evolution species or chain data raises an explicit runtime error', async () => {
  const directory = temporaryDirectory();
  try {
    await withFetch(async (url) => {
      if (String(url).includes('pokemon-species')) return response({ evolution_chain: { url: 'https://fixture.invalid/chain/9000/' } });
      return response({ chain: { species: null, evolves_to: [] } });
    }, async () => {
      await assert.rejects(() => new PokeApi(directory).line(9000), /species|evolution|chain/i);
    });
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('catalog loading does not rewrite saved paths, progress, dex, inventory, or Ditto fields', () => {
  const fixture = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const normalized = normalizeState(fixture);
  assert.deepEqual(normalized.active.pathIds, fixture.active.pathIds);
  assert.deepEqual(normalized.active.plannedPathIds, fixture.active.plannedPathIds);
  assert.equal(normalized.active.stageIndex, fixture.active.stageIndex);
  assert.equal(normalized.active.usedAtStage, fixture.active.usedAtStage);
  assert.equal(normalized.active.rarity, fixture.active.rarity);
  assert.equal(normalized.active.dittoDisguise, fixture.active.dittoDisguise);
  assert.equal(normalized.active.dittoRevealed, fixture.active.dittoRevealed);
  assert.deepEqual(normalized.dex[0].chainOrder, fixture.dex[0].chainOrder);
  assert.deepEqual(normalized.inventory, fixture.inventory);
  assert.equal(normalized.eggUsage, fixture.eggUsage);
  assert.equal(normalized.usedSinceInstall, fixture.usedSinceInstall);
  assert.equal(fs.existsSync(catalogPath), true);
});
