const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const helperSource = fs.readFileSync(path.join(root, 'assets', 'sprite-image.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const floating = fs.readFileSync(path.join(root, 'floating.html'), 'utf8');

function loadHelper() {
  const window = {};
  vm.runInNewContext(helperSource, { window, globalThis: window, console });
  return window.PokeTokenSpriteImage;
}

function image() {
  return { src: '', alt: '', dataset: {}, onload: null, onerror: null };
}

test('DOM sprite helper advances through each candidate once and finishes at the local placeholder', async () => {
  const helper = loadHelper();
  const target = image();
  const first = { src: 'https://example.invalid/first.png', provider: 'test', animated: true, shiny: false };
  const second = { src: 'https://example.invalid/second.png', provider: 'test', animated: false, shiny: false };
  const pending = helper.load(target, [first, second]);
  assert.equal(target.src, first.src);
  const firstError = target.onerror;
  firstError();
  assert.equal(target.src, second.src);
  const secondError = target.onerror;
  secondError();
  const result = await pending;
  assert.equal(target.src, 'assets/pokemon-placeholder.svg');
  assert.equal(result.fallbackKind, 'image-load-failed');
  assert.equal(result.attempts, 2);
  assert.equal(target.dataset.spriteProvider, 'local');
  assert.equal(target.dataset.spriteAnimated, 'false');
  assert.equal(target.dataset.spriteFallbackKind, 'image-load-failed');
  assert.equal(target.onload, null);
  assert.equal(target.onerror, null);
  assert.notEqual(firstError, secondError);
});

test('a newer sprite request cancels an obsolete request without letting it overwrite the image', async () => {
  const helper = loadHelper();
  const target = image();
  const oldPending = helper.load(target, [{ src: 'old.png', provider: 'old' }]);
  const oldError = target.onerror;
  const newPending = helper.load(target, [{ src: 'new.png', provider: 'new' }]);
  assert.equal(target.src, 'new.png');
  oldError();
  const oldResult = await oldPending;
  assert.equal(oldResult.cancelled, true);
  assert.equal(target.src, 'new.png');
  target.onload();
  const newResult = await newPending;
  assert.equal(newResult.src, 'new.png');
  assert.equal(target.src, 'new.png');
});

test('renderer pages load the shared helper instead of duplicating fallback policy', () => {
  assert.match(index, /<script src="assets\/sprite-image\.js"><\/script>/);
  assert.match(floating, /<script src="assets\/sprite-image\.js"><\/script>/);
  assert.match(index, /PokeTokenSpriteImage/);
  assert.match(floating, /PokeTokenSpriteImage/);
  assert.doesNotMatch(index, /function sprite\(id,shiny=false\)/);
});
