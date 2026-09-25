const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const pokedex = html.slice(html.indexOf('function pokedex()'), html.indexOf('function elapsed('));
const collection = html.slice(html.indexOf('function collection()'), html.indexOf('function checkForUpdates('));

test('the Pokédex grid no longer carries the page bar in the scrolling flow', () => {
  assert.doesNotMatch(pokedex, /tr\('previous'\)/, 'the pager must move out of the grid output');
  assert.match(pokedex, /dexPageCount=/, 'the grid must publish how many pages exist');
});

test('the page bar is rendered inside the sticky collection footer, above the rarity filters', () => {
  assert.match(html, /function dexPager\(\)/);
  assert.match(
    collection,
    /<div class="collection-footer">\$\{dexPager\(\)\}\$\{collectionFilters\(\)\}/,
    'the pager must come before the rarity filters in the sticky block'
  );
  assert.match(html, /\.collection-footer\{position:sticky;bottom:0/, 'the shared block stays pinned');
  assert.match(html, /\.dex-pager\{display:flex;/);
});

test('the page bar keeps working and hides itself when there is a single page', () => {
  const pager = html.slice(html.indexOf('function dexPager()'), html.indexOf('function collection()'));
  assert.match(pager, /dexPageCount<2\)?return ''|return ''/);
  assert.match(pager, /dexPage=Math\.max\(0,dexPage-1\);render\(\)/);
  assert.match(pager, /dexPage=Math\.min\(dexPageCount-1,dexPage\+1\);render\(\)/);
  assert.match(pager, /tr\('page'\)/);
});
