const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const settings = fs.readFileSync(path.join(root, 'core', 'settings.cjs'), 'utf8');

 test('provider controls expose selectable accessible state and survive live refresh', () => {
  assert.match(html, /function selectProvider\(name\)/);
  assert.match(html, /data-provider=/);
  assert.match(html, /aria-pressed=/);
  assert.match(html, /selectedProvider=.*providers/);
  assert.match(main, /setInterval\(refresh, minutes \* 60_000\)/);
  assert.match(html, /onSnapshot\(next=>\{data=next;render\(\)\}\)/);
});

test('egg animation uses the opening session and the requested threshold schedule', () => {
  assert.match(html, /function beginEggWindowSession\(\)/);
  assert.match(html, /eggLastPulseAt=eggOpenedAt/);
  assert.match(html, /p<\.15/);
  assert.match(html, /p<\.30/);
  assert.match(html, /p>=\.30/);
  assert.match(html, /p>=\.60/);
  assert.match(html, /p>=\.90/);
  assert.doesNotMatch(html, /p>=\.98/);
  assert.doesNotMatch(html, /p>=\.66/);
  assert.doesNotMatch(html, /p<\.33/);
  assert.match(html, /intervalMs:60000/);
  assert.match(html, /intervalMs:180000/);
  assert.match(html, /intervalMs:300000/);
  assert.match(html, /EGG_ANIMATED/);
  assert.match(html, /classList\.add\('egg-motion'\)/);
});

test('floating pet size applies while the slider moves', () => {
  assert.match(html, /oninput="updatePetSizeLive\(this\.value\)"/);
  assert.doesNotMatch(html, /onchange="setSetting\('floatingPetSize',this\.value\)"/);
  assert.match(html, /function updatePetSizeLive\(value\)/);
  assert.match(html, /floatingPetSize/);
});

test('shop item icons are enlarged by sixty percent', () => {
  assert.match(html, /\.item-icon\{width:48px;height:48px/);
  assert.match(html, /\.item-icon\.emoji\{[^}]*font-size:42px/);
});

test('settings back control has a directional arrow and settings gear is enlarged', () => {
  assert.match(html, /←/);
  assert.match(html, /\.settings-button\{[^}]*font-size:13\.2px/);
});

test('all original supported languages plus Italian are accepted', () => {
  for (const code of ['it', 'en', 'ko', 'ja', 'es', 'fr', 'pt']) {
    assert.match(settings, new RegExp(`['"]${code}['"]`));
  }
  assert.match(html, /ko:/);
  assert.match(html, /ja:/);
  assert.match(html, /es:/);
  assert.match(html, /fr:/);
  assert.match(html, /pt:/);
});

test('every settings control is rendered and routed through the setting action', () => {
  for (const key of [
    'language', 'refreshMinutes', 'limitDisplay', 'launchAtLogin',
    'menuTodayTokens', 'menuTodayCost', 'menuLimitPercent',
    'showFloatingPet', 'floatingPetSize', 'notificationsBubbles',
    'limitAlerts', 'warningPercent', 'criticalPercent',
    'companionEvents', 'providerStatus', 'keychainOptOut',
  ]) {
    assert.match(html, new RegExp(key));
  }
  assert.match(main, /type === ["']setting["']/);
});
