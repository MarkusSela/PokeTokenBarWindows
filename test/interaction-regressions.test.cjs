const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'preload.cjs'), 'utf8');

test('embedded renderer script remains syntactically valid', () => {
  const script = html.split('<script>')[1].split('</script>')[0];
  assert.doesNotThrow(() => new vm.Script(script));
});

test('renderer loads its first snapshot before rendering Home', () => {
  assert.match(html, /async function load\(\)\{data=await window\.ptb\.snapshot\(\);render\(\)\}/);
});

test('renderer has a safe bootstrap snapshot while IPC is pending', () => {
  assert.match(html, /let data=\{state:\{inventory:\{\},dex:\[\]\}/);
});

test('renderer preserves scroll position when rerendering the same section', () => {
  assert.match(html, /lastRenderedTab/);
  assert.match(html, /scrollPositions/);
  assert.match(html, /view\.scrollTop=lastRenderedTab===tab/);
  assert.match(html, /function resetHome\(\)[\s\S]*scrollTop=0/);
});

test('operation notices are shown through a timed helper', () => {
  assert.match(html, /function showNotice\(text\)/);
  assert.match(html, /setTimeout\(\(\)=>\{notice\.textContent='';/);
  assert.match(html, /showNotice\(data\.ok\?tr\('completed'\):tr\('operationUnavailable'\)\)/);
});

test('operation notices overlay the popover without contributing to its height', () => {
  assert.match(html, /main\{[^}]*position:relative/);
  assert.match(html, /\.notice\{[^}]*position:absolute/);
  assert.match(html, /\.notice\.visible\{[^}]*opacity:1/);
  assert.doesNotMatch(html, /notice\?\.offsetHeight/);
});

test('bottom navigation fills the complete popover width', () => {
  assert.match(html, /\.bottom-bar \.tabs\{[^}]*width:100%/);
});

test('bottom navigation leaves breathing room below the four main buttons', () => {
  assert.match(html, /\.bottom-bar\{[^}]*padding-top:7px[^}]*padding-bottom:6px/);
});

test('renderer requests a content-sized popover after each render', () => {
  assert.match(preload, /setPopoverContentHeight/);
  assert.match(html, /function schedulePopoverResize\(\)/);
  assert.match(html, /window\.ptb\.setPopoverContentHeight\(required\)/);
});

test('diagnostic launch does not disable normal outside-click dismissal', () => {
  assert.doesNotMatch(main, /if \(diagnosticOpen\) return;/);
  assert.match(main, /shouldHidePopoverOnBlur/);
});

test('successful candy actions explicitly synchronize the floating pet', () => {
  assert.match(main, /type === ["']candy["'][\s\S]*syncFloatingPet\(\)/);
});

test('bag content is bottom-anchored and shiny charm disappears after purchase', () => {
  assert.match(html, /class="bag-page"/);
  assert.match(html, /\.bag-page\{[^}]*min-height:0;height:auto[^}]*justify-content:flex-end/);
  assert.match(html, /!data\.state\.inventory\.shinyCharm/);
});

test('rarity controls use a rarity-specific accent and legendary is gold', () => {
  assert.match(html, /body\[data-rarity=legendary\]/);
  assert.match(html, /--rarity-accent:#b8860b/);
  assert.match(html, /\.tab\.active[^{]*\{[^}]*var\(--rarity-accent\)/);
});
