const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const main = fs.readFileSync(path.join(__dirname, '..', 'main.cjs'), 'utf8');
const preload = fs.readFileSync(path.join(__dirname, '..', 'preload.cjs'), 'utf8');
const floating = fs.readFileSync(path.join(__dirname, '..', 'floating.html'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

test('tray and taskbar use one static supplied PNG icon', () => {
  const appIcon = path.join(__dirname, '..', 'assets', 'app-icon.png');
  assert.equal(fs.existsSync(appIcon), true);
  assert.ok(fs.statSync(appIcon).size > 100);
  assert.match(main, /function icon\(\)/);
  assert.match(main, /assets["']?,\s*["']app-icon\.png/);
  assert.match(main, /icon: icon\(\)/);
  assert.match(main, /tray = new Tray\(icon\(\)\)/);
  assert.doesNotMatch(main, /renderTrayIcon|trayIconWindow|trayIconImage|updateTrayIcon/);
  assert.equal(packageJson.build.extraResources[0].from, 'assets/app-icon.png');
  assert.equal(packageJson.build.extraResources[0].to, 'app-icon.png');
  assert.equal(packageJson.build.files.includes('tray-icon.html'), false);
});

test('opening Home keeps the static icon and hiding it returns to tray-first', () => {
  assert.match(main, /skipTaskbar:\s*true/);
  assert.doesNotMatch(main, /win\.setSkipTaskbar\(false\)/);
  assert.match(main, /win\.setSkipTaskbar\(true\)/);
});

test('the Lab package uses the supplied PNG as its only icon source', () => {
  assert.equal(packageJson.build.icon, 'build/icon.ico');
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'build', 'icon.ico')), true);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'assets', 'app-icon.png')), true);
  assert.equal(packageJson.build.extraResources[0].from, 'assets/app-icon.png');
  assert.equal(packageJson.build.extraResources[0].to, 'app-icon.png');
});

test('tray footer exposes a safe quit action through the IPC bridge', () => {
  assert.match(main, /type\s*===\s*["']quit["']/);
  assert.match(preload, /action:\s*\(type, value\)\s*=>\s*ipcRenderer\.invoke\(["']action["']/);
});

test('desktop popup and floating pet keep independent layout responsibilities', () => {
  assert.match(main, /width:\s*360,\s*height:\s*600/);
  assert.match(main, /useContentSize:\s*true/);
  assert.match(main, /createFloatingPetController/);
  assert.match(main, /petController\?\.setSize/);
  assert.match(main, /function placeFloatingPet\(\)/);
  assert.doesNotMatch(main, /function placeFloatingPet\(\).*setContentSize/);
  assert.match(html, /class="home-section provider-section"/);
  assert.match(html, /legendary/);
  assert.match(html, /font:400 12px/);
});

test('settings drive the real Electron refresh and login behaviors', () => {
  assert.match(main, /function scheduleRefresh\(\)/);
  assert.match(main, /app\.setLoginItemSettings/);
  assert.match(main, /type\s*===\s*["']setting["']/);
  assert.match(main, /lastRefreshAt/);
  assert.match(main, /function createFloatingPet\(\)/);
  assert.match(main, /function syncFloatingPet\(\)/);
  assert.match(main, /function createFloatingPet\(\) \{\s*if \(petWin && !petWin\.isDestroyed\(\)\)/);
  assert.match(main, /petController\?\.cancelDrag\(\)/);
  assert.match(main, /value\.key\s*===\s*["']floatingPetSize["'][\s\S]*placeFloatingPet\(\)/);
  assert.match(floating, /html,\s*body\s*\{[\s\S]*width: 100%;[\s\S]*height: 100%;/);
  assert.doesNotMatch(floating, /100vw|100vh/);
});

test('floating pet opens the main popover on click but not after a drag', () => {
  assert.match(main, /pet-move/);
  assert.match(preload, /movePet/);
  assert.match(floating, /pointerdown/);
  assert.match(floating, /movePet/);
  assert.match(preload, /openMain/);
  assert.match(floating, /openMain/);
  assert.match(floating, /didDrag/);
});

test('floating pet context hide disables the persisted setting', () => {
  assert.match(main, /label: menuLabel\("Hide floating pet", "Nascondi pet flottante"\)[\s\S]*game\.updateSetting\("showFloatingPet", false\)/);
});

test('companion event bubbles have a renderer IPC path', () => {
  assert.match(preload, /onPetNotice/);
  assert.match(main, /pet-notice/);
  assert.match(floating, /bubble\.classList\.toggle\("visible"/);
});

test('desktop windows use the display containing their bounds and follow monitor changes', () => {
  assert.match(main, /screen\.getDisplayMatching/);
  assert.match(main, /screen\.getAllDisplays/);
  assert.match(main, /display-added/);
  assert.match(main, /display-removed/);
  assert.match(main, /display-metrics-changed/);
});
