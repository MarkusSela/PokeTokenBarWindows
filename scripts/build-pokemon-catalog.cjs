const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  buildCatalog,
  POKEAPI_SPRITES_REVISION,
  POKEAPI_BASE,
} = require('./catalog-builder.cjs');

const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'assets', 'pokemon-catalog.json');
const cacheDirectory = path.join(root, 'assets', '.test-cache', 'catalog-builder');
const overridePath = path.join(root, 'assets', 'pokemon-rarity-overrides.json');
const animatedOverridePath = path.join(root, 'assets', 'animated-sprite-overrides.json');

function createFileCache(directory) {
  return {
    get(url) {
      const key = crypto.createHash('sha256').update(url).digest('hex');
      try {
        const stored = JSON.parse(fs.readFileSync(path.join(directory, `${key}.json`), 'utf8'));
        return stored.url === url ? stored.value : undefined;
      } catch {
        return undefined;
      }
    },
    set(url, value) {
      const key = crypto.createHash('sha256').update(url).digest('hex');
      fs.mkdirSync(directory, { recursive: true });
      const destination = path.join(directory, `${key}.json`);
      const temporary = `${destination}.tmp-${process.pid}`;
      fs.writeFileSync(temporary, JSON.stringify({ url, value }), 'utf8');
      fs.renameSync(temporary, destination);
    },
  };
}

function loadOverrides() {
  const document = JSON.parse(fs.readFileSync(overridePath, 'utf8'));
  if (document?.schemaVersion !== 1 || !document.overrides || typeof document.overrides !== 'object' || Array.isArray(document.overrides))
    throw new Error('Invalid pokemon-rarity-overrides.json');
  return document.overrides;
}

function loadAnimatedSpriteOverrides() {
  const document = JSON.parse(fs.readFileSync(animatedOverridePath, 'utf8'));
  if (document?.schemaVersion !== 1
    || !document.overrides
    || typeof document.overrides !== 'object'
    || Array.isArray(document.overrides))
    throw new Error('Invalid animated-sprite-overrides.json');
  return document.overrides;
}

async function main() {
  const catalog = await buildCatalog({
    cache: createFileCache(cacheDirectory),
    outputPath,
    overrides: loadOverrides(),
    spriteOverrides: loadAnimatedSpriteOverrides(),
    spritesRevision: POKEAPI_SPRITES_REVISION,
    source: {
      provider: 'PokeAPI',
      apiBase: POKEAPI_BASE,
      snapshot: 'pokemon-species and pokemon v2 responses; generations I-IX',
      revision: 'api-v2',
      spritesRevision: POKEAPI_SPRITES_REVISION,
      animatedSpriteOverrides: 'assets/animated-sprite-overrides.json',
    },
  });
  process.stdout.write(`${JSON.stringify({
    destination: outputPath,
    schemaVersion: catalog.schemaVersion,
    catalogVersion: catalog.catalogVersion,
    coverage: catalog.coverage,
  }, null, 2)}\n`);
  return catalog;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}

module.exports = { main, outputPath, cacheDirectory, loadOverrides, loadAnimatedSpriteOverrides };
