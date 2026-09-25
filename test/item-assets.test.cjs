const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const items = path.join(root, 'assets', 'items');
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const expectedDollPngSha256 = 'b4bc71474fb4101a552f5cd8cf639c5f25b47333b6bdc2a7ef5ad7f5e3c3a2f4';
const expectedPixelMintPngSha256 = '5339424e397d8c7faa046331b57b638b395d82fa26af8b039de1266ad8cfd1bb';
const autoEggAssets = ['egg-common-auto.png', 'egg-uncommon-auto.png', 'egg-rare-auto.png'];
const newObjectAssets = [
  ['exp-candy-xl-pixel.png', 'png'],
  ['exp-candy-xl-auto.webp', 'webp'],
  ['hatch-incubator-3d.png', 'png'],
  ['shiny-incense-pixel.png', 'png'],
  ['shiny-incense-auto.png', 'png'],
];
const styleAwareObjectAssets = [
  ['poke-doll.png', 'png'],
  ['poke-doll-auto.webp', 'webp'],
  ['shiny-charm.png', 'png'],
  ['shiny-charm-auto.png', 'png'],
];

function assertPng(name) {
  const file = path.join(items, name);
  const bytes = fs.readFileSync(file);
  assert.deepEqual(bytes.subarray(0, pngSignature.length), pngSignature, `${name} must be a real PNG`);
  assert.ok(bytes.length > 100, `${name} must not be empty`);
}

test('shop item assets are real PNGs with the requested Doll and Mint files', () => {
  assertPng('poke-doll.png');
  assertPng('mint.png');
  const dollBytes = fs.readFileSync(path.join(items, 'poke-doll.png'));
  assert.equal(crypto.createHash('sha256').update(dollBytes).digest('hex'), expectedDollPngSha256);
  const mintBytes = fs.readFileSync(path.join(items, 'mint.png'));
  assert.equal(crypto.createHash('sha256').update(mintBytes).digest('hex'), expectedPixelMintPngSha256);
});

test('no implicit heart asset is accepted as a Doll or Mint file', () => {
  assert.equal(fs.existsSync(path.join(items, 'heart.png')), false);
  assert.equal(fs.existsSync(path.join(items, 'heart.webp')), false);
});

test('auto Shop egg assets are transparent PNGs for all three tiers', () => {
  for (const name of autoEggAssets) {
    assertPng(name);
    const image = fs.readFileSync(path.join(items, name));
    assert.ok(image.length > 1000, `${name} must contain the cleaned sharp artwork`);
  }
});

test('every style-aware object ships a real pixel and Auto artwork', () => {
  for (const [name, format] of styleAwareObjectAssets) {
    const bytes = fs.readFileSync(path.join(items, name));
    assert.ok(bytes.length > 100, `${name} must not be empty`);
    if (format === 'png') assert.deepEqual(bytes.subarray(0, pngSignature.length), pngSignature, `${name} must be a real PNG`);
    if (format === 'webp') {
      assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', `${name} must be a RIFF WebP`);
      assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP', `${name} must be WebP`);
    }
  }
});

test('style-aware object artwork is distinct per style and never a renamed duplicate', () => {
  const digests = styleAwareObjectAssets.map(([name]) =>
    crypto.createHash('sha256').update(fs.readFileSync(path.join(items, name))).digest('hex'));
  assert.equal(new Set(digests).size, digests.length);
});

test('new object assets are staged with decodable PNG or WebP signatures', () => {
  for (const [name, format] of newObjectAssets) {
    const bytes = fs.readFileSync(path.join(items, name));
    assert.ok(bytes.length > 100, `${name} must not be empty`);
    if (format === 'png') assert.deepEqual(bytes.subarray(0, pngSignature.length), pngSignature, `${name} must be a real PNG`);
    if (format === 'webp') assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', `${name} must be a RIFF WebP`);
    if (format === 'webp') assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP', `${name} must be WebP`);
  }
});
