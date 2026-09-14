const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Game, BALANCE } = require('../core/game.cjs');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'preload.cjs'), 'utf8');
const floating = fs.readFileSync(path.join(root, 'floating.html'), 'utf8');

function activePokemon() {
  return {
    baseId: 1,
    pathIds: [1],
    plannedPathIds: [1],
    stageIndex: 0,
    usedAtStage: 0,
    rarity: 'common',
    totalForms: 1,
  };
}

test('shop egg purchases accept common, uncommon and rare tiers with the correct price', () => {
  const expected = { common: 1_000_000_000, uncommon: 2_500_000_000, rare: 4_000_000_000 };
  for (const [requestedTier, price] of [[null, expected.common], ['uncommon', expected.uncommon], ['rare', expected.rare]]) {
    const game = Game.fresh({
      state: { usedSinceInstall: 10_000_000_000, active: activePokemon() },
    });
    assert.equal(game.buyEgg(requestedTier), true, requestedTier || 'common');
    assert.equal(game.state.eggTier, requestedTier || 'common');
    assert.equal(game.state.spentTokens, price);
    assert.equal(game.state.active, null);
    assert.equal(game.state.eggUsage, 0);
  }
});

test('uncommon and rare egg purchases replace an incubating egg after explicit UI confirmation', () => {
  for (const tier of ['uncommon', 'rare']) {
    const game = Game.fresh({ state: { usedSinceInstall: 10_000_000_000, eggUsage: 123 } });
    assert.equal(game.buyEgg(tier), true, tier);
    assert.equal(game.state.eggTier, tier);
    assert.equal(game.state.eggUsage, 0);
  }
  assert.match(html, /function buyEggFromShop\(tier\)/);
  assert.match(html, /window\.confirm\(/);
});

test('Poké Doll activation exposes the initial free egg to the Bag UI', () => {
  assert.match(html, /function canActivatePokeDoll\(\)\{return Boolean\(!data\.active&&data\.egg\?\.incubating\)\}/);
  assert.doesNotMatch(html, /function canActivatePokeDoll\(\)\{return Boolean\(!data\.active&&data\.egg\?\.tier\)\}/);
  assert.match(main, /incubating:\s*!game\.state\.active/);
});

test('rarity badges encode the requested visual language and are used for eggs and Pokémon', () => {
  assert.match(html, /function rarityBadge\(rarity\)/);
  assert.match(html, /class="rarity-badge rarity-\$\{rarity\}"/);
  assert.match(html, /rarity-badge\.rarity-common/);
  assert.match(html, /rarity-badge\.rarity-uncommon/);
  assert.match(html, /rarity-badge\.rarity-rare/);
  assert.match(html, /rarity-badge\.rarity-legendary/);
  assert.match(html, /transform:rotate\(45deg\)/);
  assert.match(html, /clip-path:polygon\(/);
  assert.match(html, /rarityBadge\(data\.egg\?\.tier\)/);
  assert.match(html, /rarityBadge\(a\.rarity\)/);
  assert.doesNotMatch(html, /<div class="dex-name-row"><b>[^<]*<\/b>\$\{rarityBadge\(x\.rarity\)\}/);
  assert.match(main, /tier: game\.state\.eggTier/);
});

test('collection filters and mode buttons share a fixed footer below the content', () => {
  assert.ok(html.indexOf("${collectionMode==='dex'?pokedex():catchLog()}") >= 0);
  assert.ok(html.indexOf('class="collection-footer"') < html.indexOf('class="collection-toggle"'));
  assert.match(html, /\.collection-footer\{[^}]*position:sticky[^}]*bottom:0/);
  assert.match(html, /\.collection-toggle\{[^}]*margin:0/);
  assert.match(html, /\.dex-cell\{[^}]*display:grid/);
  assert.match(html, /\.pin-button\{[^}]*min-height/);
});

test('collection controls stay readable and separated from the main navigation', () => {
  assert.match(html, /collectionMode==='dex'[^>]*>Pokémon<\/button>/);
  assert.match(html, /class="collection-filters provider-pills"/);
  assert.match(html, /\.collection-footer\{[^}]*padding-top:6px[^}]*padding-bottom:6px/);
  assert.match(html, /\.tabs\{[^}]*gap:6px[^}]*margin-bottom:8px/);
});

test('Home does not render the blue dot below the Pokémon sprite', () => {
  assert.doesNotMatch(html, /hero-dot/);
});

test('Catch log does not render rarity badges', () => {
  assert.doesNotMatch(html, /function catchLog\(\)\{[\s\S]*?rarityBadge\(x\.rarity\)/);
});

test('settings hide optional sliders while their feature toggle is disabled', () => {
  assert.match(html, /\$\{s\.showFloatingPet\?`<div class="setting">[\s\S]*?floatingPetSize/);
  assert.match(html, /\$\{s\.showGoldWalking\?`<div class="setting">[\s\S]*?goldWalkingSize/);
});

test('popover height leaves a safety margin below the usable work area', () => {
  assert.match(main, /clampPopoverHeight\(requestedHeight, area\.height - 16\)/);
});

test('pet receives item and evolution sparkle events and mirrors Home egg motion thresholds', () => {
  assert.match(preload, /onPetEffect/);
  assert.match(main, /pet-effect/);
  assert.match(main, /function petFollowsActive\(\)/);
  assert.match(main, /refresh\([\s\S]{0,140}"sparkle"/);
  assert.match(floating, /onPetEffect/);
  assert.match(floating, /function syncEggMotion\(snapshot\)/);
  assert.match(floating, /intervalMs: 300000/);
  assert.match(floating, /intervalMs: 180000/);
  assert.match(floating, /intervalMs: 60000/);
  assert.match(floating, /function playPetEffect\(kind\)/);
  assert.match(floating, /content: "✨"/);
  assert.match(floating, /mintSparkle/);
});

test('floating egg uses its animated asset during pulse and continuous motion', () => {
  assert.match(floating, /let eggStaticSprite/);
  assert.match(floating, /let eggAnimatedSprite/);
  assert.match(floating, /snapshot\?\.egg\?\.animatedSprite/);
  assert.match(floating, /sprite\.src\s*=\s*`\$\{eggAnimatedSprite\}\?pulse=/);
  assert.match(floating, /sprite\.src\s*=\s*`\$\{eggAnimatedSprite\}\?continuous=/);
});

test('sparkle glow uses a transparent radial aura instead of lighting the pet image rectangle', () => {
  assert.match(html, /\.mint-sparkle\{[^}]*background:radial-gradient/);
  assert.doesNotMatch(html, /\.mint-sparkle \.sprite\{filter:drop-shadow/);
  assert.match(floating, /#effect\s*\{[^}]*background:\s*radial-gradient/);
  assert.doesNotMatch(floating, /#sprite\.pet-sparkle\{\s*filter:/);
});

test('pet hover bubble contains only the token count', () => {
  assert.match(floating, /bubble\.textContent = `\$\{Number\(tokens\)\.toLocaleString\("en-US"\)\} tokens today`/);
  assert.doesNotMatch(floating, /bubble\.textContent = `\$\{name\}/);
});

void BALANCE;
